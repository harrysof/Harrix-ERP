import type { MessageKey } from '../i18n/messages/index.js';

/**
 * The permission vocabulary. Pure data and pure functions — no Nest, no
 * Prisma — so it can be unit tested and imported anywhere.
 *
 * Guards never check a role's *name*. They check whether the user's role
 * carries a permission string. This is what lets the next factory rename
 * "gérant" to something else, or invent a "chef d'équipe" role, without a
 * code change (build plan, Phase 2).
 *
 * Naming: "<domain>:<action>", where read < write < manage.
 *   read   — see it
 *   write  — do the everyday job (receive stock, declare a batch)
 *   manage — change the setup itself (create users, delete articles)
 */
export const PERMISSIONS = {
  STOCK_READ: 'stock:read',
  STOCK_WRITE: 'stock:write',
  STOCK_MANAGE: 'stock:manage',

  PRODUCTION_READ: 'production:read',
  PRODUCTION_WRITE: 'production:write',

  SUPPLIERS_READ: 'suppliers:read',
  SUPPLIERS_WRITE: 'suppliers:write',

  PURCHASING_READ: 'purchasing:read',
  PURCHASING_WRITE: 'purchasing:write',
  /// Approving a purchase order is a spending decision, separate from writing one.
  PURCHASING_APPROVE: 'purchasing:approve',

  ORDERS_READ: 'orders:read',
  ORDERS_WRITE: 'orders:write',

  HR_READ: 'hr:read',
  HR_WRITE: 'hr:write',

  USERS_MANAGE: 'users:manage',
  AUDIT_READ: 'audit:read',

  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/**
 * Grouped for the user-management screen, so the gérant sees why each
 * exists. Labels are message keys, not text — this file has no Nest
 * request in scope to translate them with, so users.controller.ts resolves
 * them with `t()` at request time, in the caller's language.
 */
export const PERMISSION_GROUPS: Array<{ labelKey: MessageKey; permissions: Array<{ key: Permission; labelKey: MessageKey }> }> = [
  {
    labelKey: 'perm.group.stock',
    permissions: [
      { key: PERMISSIONS.STOCK_READ, labelKey: 'perm.stock.read' },
      { key: PERMISSIONS.STOCK_WRITE, labelKey: 'perm.stock.write' },
      { key: PERMISSIONS.STOCK_MANAGE, labelKey: 'perm.stock.manage' },
    ],
  },
  {
    labelKey: 'perm.group.production',
    permissions: [
      { key: PERMISSIONS.PRODUCTION_READ, labelKey: 'perm.production.read' },
      { key: PERMISSIONS.PRODUCTION_WRITE, labelKey: 'perm.production.write' },
    ],
  },
  {
    labelKey: 'perm.group.suppliers',
    permissions: [
      { key: PERMISSIONS.SUPPLIERS_READ, labelKey: 'perm.suppliers.read' },
      { key: PERMISSIONS.SUPPLIERS_WRITE, labelKey: 'perm.suppliers.write' },
    ],
  },
  {
    labelKey: 'perm.group.purchasing',
    permissions: [
      { key: PERMISSIONS.PURCHASING_READ, labelKey: 'perm.purchasing.read' },
      { key: PERMISSIONS.PURCHASING_WRITE, labelKey: 'perm.purchasing.write' },
      { key: PERMISSIONS.PURCHASING_APPROVE, labelKey: 'perm.purchasing.approve' },
    ],
  },
  {
    labelKey: 'perm.group.orders',
    permissions: [
      { key: PERMISSIONS.ORDERS_READ, labelKey: 'perm.orders.read' },
      { key: PERMISSIONS.ORDERS_WRITE, labelKey: 'perm.orders.write' },
    ],
  },
  {
    labelKey: 'perm.group.hr',
    permissions: [
      { key: PERMISSIONS.HR_READ, labelKey: 'perm.hr.read' },
      { key: PERMISSIONS.HR_WRITE, labelKey: 'perm.hr.write' },
    ],
  },
  {
    labelKey: 'perm.group.admin',
    permissions: [
      { key: PERMISSIONS.USERS_MANAGE, labelKey: 'perm.users.manage' },
      { key: PERMISSIONS.AUDIT_READ, labelKey: 'perm.audit.read' },
    ],
  },
  {
    labelKey: 'perm.group.finance',
    permissions: [
      { key: PERMISSIONS.FINANCE_READ, labelKey: 'perm.finance.read' },
      { key: PERMISSIONS.FINANCE_WRITE, labelKey: 'perm.finance.write' },
    ],
  },
];

/**
 * Role.permissions is one comma-separated string (SQLite has no array type).
 * These two functions are the only place that format is known — nothing else
 * should split or join it by hand.
 */
export function parsePermissions(stored: string): Permission[] {
  return stored
    .split(',')
    .map((p) => p.trim())
    .filter((p): p is Permission => (ALL_PERMISSIONS as string[]).includes(p));
}

export function serializePermissions(permissions: string[]): string {
  // Deduplicated, filtered to known values, and stored in a stable order so
  // two roles with the same access compare equal in the audit log.
  const known = ALL_PERMISSIONS.filter((p) => permissions.includes(p));
  return known.join(',');
}

export function hasPermission(granted: Permission[], required: Permission): boolean {
  return granted.includes(required);
}

/** True when the user holds every one of the required permissions. */
export function hasAllPermissions(granted: Permission[], required: Permission[]): boolean {
  return required.every((r) => granted.includes(r));
}

/** Any unknown strings in the input — used to reject typos at the API boundary. */
export function unknownPermissions(permissions: string[]): string[] {
  return permissions.filter((p) => !(ALL_PERMISSIONS as string[]).includes(p));
}
