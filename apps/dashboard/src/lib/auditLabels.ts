/** Shared between AuditPage (the full journal) and NotificationBell (the filtered feed). */

export const ACTION_LABELS: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  LOGIN: "Connexion",
  LOGIN_FAILED: "Échec de connexion",
};

export const ACTION_TONES: Record<string, "ok" | "warn" | "danger" | "neutral"> = {
  CREATE: "ok",
  UPDATE: "neutral",
  DELETE: "danger",
  LOGIN: "neutral",
  LOGIN_FAILED: "warn",
};

/**
 * The "Concerne" column stores the backend route's own segments (see
 * audit.interceptor.ts's describeTarget) — technical, not meant for a
 * gérant. This is every combination that route table can currently produce;
 * anything new falls back to a humanized version rather than the raw slug.
 */
const ENTITY_LABELS: Record<string, string> = {
  "hr/employees": "Employés (RH)",
  "hr/absences": "Absences (RH)",
  "hr/time-entries": "Heures travaillées (RH)",
  "production/batches": "Lots de production",
  "purchasing/orders": "Bons de commande (achats)",
  "sales/customers": "Clients",
  "sales/orders": "Commandes (ventes)",
  "settings/inventory-types": "Types d'inventaire",
  "stock/items": "Articles (stock)",
  "supplier-orders": "Commandes fournisseurs (stock)",
  "supplier-orders/receive": "Réceptions fournisseur (stock)",
  suppliers: "Fournisseurs",
  users: "Utilisateurs",
  "users/roles": "Rôles",
  "users/deactivate": "Désactivation d'utilisateur",
  "users/activate": "Activation d'utilisateur",
  "users/password": "Mot de passe (utilisateur)",
  "auth/change-password": "Mot de passe",
  session: "Connexion",
  inconnu: "Inconnu",
};

function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity.split("/").map(humanize).join(" / ");
}
