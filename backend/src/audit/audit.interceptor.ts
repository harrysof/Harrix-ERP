import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/current-user.js';

/** Never write these to the log, at any depth, whatever the endpoint. */
const REDACTED_FIELDS = ['password', 'currentPassword', 'newPassword', 'passwordHash', 'accessToken', 'token'];

/**
 * Records every successful write. Registered globally, so a new endpoint is
 * audited the moment it exists rather than whenever someone remembers.
 *
 * Deliberate choices:
 * - Only writes (POST/PATCH/PUT/DELETE). Logging reads would bury the
 *   interesting rows in noise.
 * - Only successes. A rejected request changed nothing; failed *logins* are
 *   the exception and are logged by AuthService, which knows why they failed.
 * - Passwords are stripped before anything is stored, at every depth.
 * - Logging never breaks the request: if the audit write fails, the user's
 *   action still succeeded and we don't pretend otherwise.
 *
 * What it can't do: show the value *before* an update. The interceptor sees
 * the request body and the response, not the prior row. For the entities where
 * the previous value matters most, the ledger already answers it — Movement
 * and AuditEntry are append-only, so nothing is ever silently overwritten.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) return next.handle();

    return next.handle().pipe(
      tap((response) => {
        // Fire-and-forget: the action already succeeded, and a failure to
        // write the log must not turn that into an error for the user.
        void this.record(request, method, response).catch((error) => {
          console.error('[audit] failed to record entry:', error);
        });
      }),
    );
  }

  private async record(request: { user?: AuthenticatedUser; url: string; path?: string; body?: unknown }, method: string, response: unknown) {
    const user = request.user;
    // /auth/login writes its own entry (it knows whether it succeeded and who
    // it was for); logging it again here would double every login.
    const path: string = request.path ?? request.url ?? '';
    if (path.endsWith('/auth/login')) return;

    const { entity, entityId } = describeTarget(path, response);

    await this.prisma.auditEntry.create({
      data: {
        userId: user?.id ?? null,
        userLogin: user?.login ?? 'anonyme',
        action: actionFor(method),
        entity,
        entityId,
        changes: serializeChanges(request.body, response),
        method,
        path,
      },
    });
  }
}

function actionFor(method: string): string {
  if (method === 'POST') return 'CREATE';
  if (method === 'DELETE') return 'DELETE';
  return 'UPDATE';
}

/**
 * Turns "/api/stock/items/abc123/receive" into {entity: "stock/items",
 * entityId: "abc123"}. Best-effort: the log is for a human reading it, so a
 * slightly coarse entity name is fine, a wrong id is not.
 */
function describeTarget(path: string, response: unknown): { entity: string; entityId: string | null } {
  const parts = path.replace(/^\/api\//, '').split('/').filter(Boolean);
  const idFromResponse = typeof response === 'object' && response !== null && 'id' in response ? String((response as { id: unknown }).id) : null;

  // The id in the path is whatever segment looks like a cuid.
  const idFromPath = parts.find((p) => /^c[a-z0-9]{20,}$/i.test(p)) ?? null;

  const entity = parts.filter((p) => p !== idFromPath).slice(0, 2).join('/') || 'inconnu';
  return { entity, entityId: idFromPath ?? idFromResponse };
}

/**
 * What changed, as JSON. Stores the submitted fields (redacted) plus the id
 * of whatever came back, which is enough to answer "who created this" and
 * "what did they set it to".
 */
function serializeChanges(body: unknown, response: unknown): string | null {
  const submitted = redact(body);
  const hasBody = submitted && typeof submitted === 'object' && Object.keys(submitted).length > 0;
  if (!hasBody) return null;

  try {
    const payload: Record<string, unknown> = { submitted };
    if (typeof response === 'object' && response !== null && 'id' in response) {
      payload.resultId = (response as { id: unknown }).id;
    }
    const json = JSON.stringify(payload);
    // A pathological body shouldn't bloat the table; the shape is still visible.
    return json.length > 4000 ? `${json.slice(0, 4000)}…(tronqué)` : json;
  } catch {
    return null;
  }
}

/** Strips secret fields at every depth, including inside arrays. */
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value === null || typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACTED_FIELDS.includes(key) ? '***' : redact(val);
  }
  return out;
}
