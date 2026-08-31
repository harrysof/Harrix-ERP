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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/** Grouped for the user-management screen, so the gérant sees why each exists. */
export const PERMISSION_GROUPS: Array<{ label: string; permissions: Array<{ key: Permission; label: string }> }> = [
  {
    label: 'Stock',
    permissions: [
      { key: PERMISSIONS.STOCK_READ, label: 'Consulter le stock' },
      { key: PERMISSIONS.STOCK_WRITE, label: 'Réceptions et sorties' },
      { key: PERMISSIONS.STOCK_MANAGE, label: 'Créer, modifier, supprimer des articles' },
    ],
  },
  {
    label: 'Production',
    permissions: [
      { key: PERMISSIONS.PRODUCTION_READ, label: 'Consulter les lots et les pertes' },
      { key: PERMISSIONS.PRODUCTION_WRITE, label: 'Créer des lots, déclarer les sorties' },
    ],
  },
  {
    label: 'Fournisseurs',
    permissions: [
      { key: PERMISSIONS.SUPPLIERS_READ, label: 'Consulter les fournisseurs' },
      { key: PERMISSIONS.SUPPLIERS_WRITE, label: 'Créer et modifier les fournisseurs' },
    ],
  },
  {
    label: 'Achats',
    permissions: [
      { key: PERMISSIONS.PURCHASING_READ, label: 'Consulter les bons de commande' },
      { key: PERMISSIONS.PURCHASING_WRITE, label: 'Créer des bons de commande et enregistrer les réceptions' },
      { key: PERMISSIONS.PURCHASING_APPROVE, label: 'Approuver et annuler les bons de commande' },
    ],
  },
  {
    label: 'Commandes & clients',
    permissions: [
      { key: PERMISSIONS.ORDERS_READ, label: 'Consulter les commandes' },
      { key: PERMISSIONS.ORDERS_WRITE, label: 'Créer et expédier des commandes' },
    ],
  },
  {
    label: 'Ressources humaines',
    permissions: [
      { key: PERMISSIONS.HR_READ, label: 'Consulter les employés et les salaires' },
      { key: PERMISSIONS.HR_WRITE, label: 'Modifier les employés, heures et absences' },
    ],
  },
  {
    label: 'Administration',
    permissions: [
      { key: PERMISSIONS.USERS_MANAGE, label: 'Créer et désactiver des utilisateurs' },
      { key: PERMISSIONS.AUDIT_READ, label: "Consulter le journal d'activité" },
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
