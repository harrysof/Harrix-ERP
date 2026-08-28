import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { parsePermissions } from './permissions.js';
import type { AuthenticatedUser } from './current-user.js';

/**
 * Authenticates every request. Registered globally in app.module.ts, so a new
 * endpoint is protected by default and has to opt out with @Public() — the
 * safe direction for a mistake to fall.
 *
 * It re-reads the user from the database on every request rather than
 * trusting the token's contents. That costs one query, and buys the thing the
 * build plan asks for: deactivating a worker cuts their access on their very
 * next request, instead of whenever their token happens to expire. Role
 * changes take effect just as immediately.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = extractBearerToken(request.headers?.authorization);
    if (!token) throw new UnauthorizedException('Authentification requise.');

    let payload: { sub?: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: this.config.getOrThrow<string>('JWT_SECRET') });
    } catch {
      throw new UnauthorizedException('Session expirée ou invalide. Reconnectez-vous.');
    }
    if (!payload.sub) throw new UnauthorizedException('Jeton invalide.');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (!user) throw new UnauthorizedException('Compte introuvable.');
    if (!user.active) throw new UnauthorizedException('Ce compte a été désactivé.');

    const authenticated: AuthenticatedUser = {
      id: user.id,
      login: user.login,
      fullName: user.fullName,
      roleKey: user.role.key,
      roleLabel: user.role.label,
      permissions: parsePermissions(user.role.permissions),
    };
    request.user = authenticated;
    return true;
  }
}

function extractBearerToken(header: unknown): string | null {
  if (typeof header !== 'string') return null;
  const [scheme, value] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && value ? value : null;
}
