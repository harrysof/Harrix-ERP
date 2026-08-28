import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Permission } from './permissions.js';

/** What the guards attach to the request, and what `@CurrentUser()` returns. */
export interface AuthenticatedUser {
  id: string;
  login: string;
  fullName: string;
  roleKey: string;
  roleLabel: string;
  permissions: Permission[];
}

/** Injects the logged-in user into a controller method. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  return ctx.switchToHttp().getRequest().user;
});
