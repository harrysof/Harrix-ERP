import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './require-permission.decorator.js';
import { hasAllPermissions, type Permission } from './permissions.js';
import type { AuthenticatedUser } from './current-user.js';
import { t } from '../i18n/messages/index.js';

/**
 * Enforces @RequirePermissions on the backend — the build plan's "hiding a
 * button stops an honest mistake, only the backend stops someone who is
 * curious". Hiding a tab in the sidebar is a convenience; this is the rule.
 *
 * Runs globally, after JwtAuthGuard, so `request.user` is already populated.
 * A route with no @RequirePermissions is readable by any logged-in user.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: AuthenticatedUser | undefined = context.switchToHttp().getRequest().user;
    // No user here means the route is @Public but also permission-guarded,
    // which is a wiring mistake rather than something to let through.
    if (!user) throw new ForbiddenException(t('auth.accessDenied'));

    if (!hasAllPermissions(user.permissions, required)) {
      throw new ForbiddenException(t('auth.roleForbids', { role: user.roleLabel }));
    }
    return true;
  }
}
