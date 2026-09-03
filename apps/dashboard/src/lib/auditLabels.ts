/** Shared between AuditPage (the full journal) and NotificationBell (the filtered feed). */
import type { TranslationKey } from "./i18n";

export const ACTION_LABELS: Record<string, TranslationKey> = {
  CREATE: "audit.action.CREATE",
  UPDATE: "audit.action.UPDATE",
  DELETE: "audit.action.DELETE",
  LOGIN: "audit.action.LOGIN",
  LOGIN_FAILED: "audit.action.LOGIN_FAILED",
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
const ENTITY_LABELS: Record<string, TranslationKey> = {
  "hr/employees": "audit.entity.hrEmployees",
  "hr/absences": "audit.entity.hrAbsences",
  "hr/time-entries": "audit.entity.hrTimeEntries",
  "production/batches": "audit.entity.productionBatches",
  "purchasing/orders": "audit.entity.purchasingOrders",
  "sales/customers": "audit.entity.salesCustomers",
  "sales/orders": "audit.entity.salesOrders",
  "settings/inventory-types": "audit.entity.inventoryTypes",
  "stock/items": "audit.entity.stockItems",
  "supplier-orders": "audit.entity.supplierOrders",
  "supplier-orders/receive": "audit.entity.supplierOrdersReceive",
  suppliers: "audit.entity.suppliers",
  users: "audit.entity.users",
  "users/roles": "audit.entity.roles",
  "users/deactivate": "audit.entity.userDeactivate",
  "users/activate": "audit.entity.userActivate",
  "users/password": "audit.entity.userPassword",
  "auth/change-password": "audit.entity.changePassword",
  session: "audit.entity.session",
  inconnu: "audit.entity.unknown",
};

function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The journal's "Concerne" column. Takes the translator rather than returning
 * a key, because a route nobody has labelled yet falls back to its own
 * humanized slug — the caller would otherwise have to handle two shapes.
 */
export function entityLabel(
  entity: string,
  t: (key: TranslationKey) => string,
): string {
  const key = ENTITY_LABELS[entity];
  return key ? t(key) : entity.split("/").map(humanize).join(" / ");
}
