import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permissions.js';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Declares what a route needs. The user must hold ALL listed permissions.
 *
 * Note this names a *permission*, never a role — see permissions.ts for why.
 */
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
