import type { ReactNode } from "react";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { CONTRACT_TYPE_LABELS, MARITAL_STATUS_LABELS, ABSENCE_TYPE_LABELS } from "../../lib/hrApi";
import { STATUS_LABELS as PRODUCTION_STATUS_LABELS } from "../../lib/productionApi";
import { PO_STATUS_LABELS } from "../../lib/purchasingApi";
import { SHIPMENT_LABELS, PAYMENT_LABELS } from "../../lib/salesApi";

/**
 * The audit log stores exactly what was submitted to the API — see backend
 * audit.interceptor.ts's serializeChanges. It never captures the value
 * *before* a change, only the request body, so this can render "what was
 * set" but never "what changed from what". Field keys are the DTOs' own
 * camelCase names; this dictionary is what turns them into something the
 * gérant can actually read.
 */
const FIELD_LABELS: Record<string, string> = {
  // identity / people
  fullName: "Nom complet",
  login: "Identifiant",
  phone: "Téléphone",
  email: "Email",
  address: "Adresse",
  contactName: "Contact",
  registration: "Registre de commerce / NIF",
  roleId: "Rôle",

  // HR
  position: "Poste",
  hireDate: "Date d'embauche",
  birthDate: "Date de naissance",
  nin: "NIN",
  cnasNumber: "N° CNAS",
  contractType: "Type de contrat",
  contractEndDate: "Fin de contrat",
  maritalStatus: "Situation familiale",
  dependentChildren: "Enfants à charge",
  salary: "Salaire",
  bankRib: "RIB bancaire",
  emergencyContactName: "Contact d'urgence",
  emergencyContactPhone: "Téléphone d'urgence",
  employeeId: "Employé",
  startDate: "Date de début",
  endDate: "Date de fin",
  reason: "Motif",
  hoursWorked: "Heures travaillées",
  source: "Source",

  // stock / articles
  name: "Nom",
  reference: "Référence",
  unit: "Unité",
  reorderThreshold: "Seuil de réapprovisionnement",
  photoUrl: "Photo",
  color: "Couleur",
  size: "Taille",
  description: "Description",
  compatibility: "Compatibilité",
  manufacturer: "Fabricant",
  location: "Emplacement",
  criticality: "Criticité",
  gender: "Genre",
  price: "Prix de vente",
  unitCost: "Coût unitaire",
  itemId: "Article",
  batchId: "Lot",
  batchNumber: "N° de lot",
  stockBatchId: "Lot de stock",
  expiryDate: "Date de péremption",
  maintenanceRef: "Réf. maintenance",
  employee: "Employé",
  quality: "Qualité",
  quantity: "Quantité",

  // production
  productItemId: "Produit",
  machine: "Machine",
  shift: "Équipe",
  supervisor: "Responsable",
  operator: "Opérateur",
  startTime: "Heure de début",
  endTime: "Heure de fin",
  firstChoice: "1er choix",
  secondChoice: "2ème choix",
  waste: "Rebut",
  expectedQuantity: "Quantité attendue",
  varianceNote: "Note sur l'écart",
  creditStock: "Créditer le stock",

  // purchasing / suppliers
  supplierId: "Fournisseur",
  orderDate: "Date de commande",
  expectedDate: "Livraison prévue",
  deliveryNote: "Bon de livraison",
  allowOverDelivery: "Autoriser la sur-livraison",
  purchaseOrderLineId: "Ligne de commande",
  quantityOrdered: "Quantité commandée",
  lineId: "Ligne",

  // sales
  customerId: "Client",
  code: "Code",
  date: "Date",
  status: "Statut",
  shipmentStatus: "Statut d'expédition",
  paymentStatus: "Statut de paiement",
  shipping: "Livraison",
  discount: "Remise",
  discountType: "Type de remise",
  tax: "Taxe",
  taxRate: "Taux de taxe",
  unitPrice: "Prix unitaire",
  markPaid: "Marquer payé",
  shipToName: "Destinataire",
  shipToPhone: "Téléphone (livraison)",
  shipToEmail: "Email (livraison)",
  shipToAddress: "Adresse (livraison)",
  shipToCity: "Ville (livraison)",
  shipToProvince: "Wilaya (livraison)",
  shipToCountry: "Pays (livraison)",

  // settings / roles / structural
  key: "Clé",
  label: "Libellé",
  singular: "Singulier",
  defaultUnit: "Unité par défaut",
  sortOrder: "Ordre d'affichage",
  permissions: "Permissions",
  notes: "Notes",
  lines: "Lignes",
  consumptions: "Consommations",
  output: "Sortie déclarée",
  inventoryTypeId: "Type d'inventaire",
  type: "Type",

  // auth (always redacted to "***" server-side, kept so the label still reads well)
  password: "Mot de passe",
  currentPassword: "Mot de passe actuel",
  newPassword: "Nouveau mot de passe",
};

const MONEY_FIELDS = new Set(["salary", "unitCost", "price", "shipping", "discount", "tax", "unitPrice"]);
const DATE_FIELDS = new Set(["startDate", "endDate", "hireDate", "birthDate", "contractEndDate", "date", "expiryDate", "expectedDate", "orderDate"]);

/**
 * Enum-ish fields whose raw value is a backend status code (e.g. "CANCELLED",
 * "PARTIALLY_RECEIVED") rather than something meant to be read as-is. Most
 * are unambiguous; "status" and "type" are shared by more than one entity, so
 * those two need the audit entry's `entity` to pick the right dictionary.
 */
const DISCOUNT_TYPE_LABELS: Record<string, string> = { FIXED: "Montant fixe", PERCENT: "Pourcentage" };

function translateEnumValue(key: string, value: string, entity: string): string {
  switch (key) {
    case "discountType":
      return DISCOUNT_TYPE_LABELS[value] ?? value;
    case "contractType":
      return CONTRACT_TYPE_LABELS[value as keyof typeof CONTRACT_TYPE_LABELS] ?? value;
    case "maritalStatus":
      return MARITAL_STATUS_LABELS[value as keyof typeof MARITAL_STATUS_LABELS] ?? value;
    case "shipmentStatus":
      return SHIPMENT_LABELS[value as keyof typeof SHIPMENT_LABELS] ?? value;
    case "paymentStatus":
      return PAYMENT_LABELS[value as keyof typeof PAYMENT_LABELS] ?? value;
    case "type":
      return entity === "hr/absences" ? (ABSENCE_TYPE_LABELS[value as keyof typeof ABSENCE_TYPE_LABELS] ?? value) : value;
    case "status":
      if (entity === "production/batches") return PRODUCTION_STATUS_LABELS[value as keyof typeof PRODUCTION_STATUS_LABELS] ?? value;
      if (entity === "purchasing/orders") return PO_STATUS_LABELS[value as keyof typeof PO_STATUS_LABELS] ?? value;
      return value;
    default:
      return value;
  }
}

/** "dependentChildren" → "Dependent Children" — only hit for a field nobody's labelled yet. */
function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? humanize(key);
}

function renderValue(key: string, value: unknown, entity: string, siblings?: Record<string, unknown>): ReactNode {
  if (value === null || value === undefined || value === "") return <span className="muted">—</span>;

  if (typeof value === "boolean") return value ? "Oui" : "Non";

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="muted">—</span>;
    if (value.every((v) => typeof v !== "object" || v === null)) return value.join(", ");
    return (
      <ol className="audit-sublist">
        {value.map((item, i) => (
          <li key={i}>{renderObject(item as Record<string, unknown>, entity)}</li>
        ))}
      </ol>
    );
  }

  if (typeof value === "object") return renderObject(value as Record<string, unknown>, entity);

  if (typeof value === "number") {
    // discount is a DZD amount for FIXED (the default) but a fraction when the
    // sibling discountType is PERCENT — same shape as taxRate below.
    if (key === "discount" && siblings?.discountType === "PERCENT") return `${(value * 100).toFixed(0)} %`;
    if (MONEY_FIELDS.has(key)) return formatCurrency(value);
    if (key === "taxRate") return `${(value * 100).toFixed(0)} %`;
    return formatNumber(value);
  }

  if (typeof value === "string") {
    if (/Id$/.test(key)) return <span className="muted tabular audit-ref">{value}</span>;
    if (DATE_FIELDS.has(key)) {
      try {
        return formatDate(value);
      } catch {
        return value;
      }
    }
    return translateEnumValue(key, value, entity);
  }

  return String(value);
}

function renderObject(obj: Record<string, unknown>, entity: string): ReactNode {
  const entries = Object.entries(obj);
  if (entries.length === 0) return <span className="muted">—</span>;
  return (
    <div className="audit-fields">
      {entries.map(([key, value]) => (
        <div key={key} className="audit-field">
          <span className="audit-field-label">{fieldLabel(key)}</span>
          <span className="audit-field-value">{renderValue(key, value, entity, obj)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Turns the raw `{ submitted: {...}, resultId: "..." }` JSON into a labelled
 * field list. `entity` disambiguates the handful of field names shared by
 * more than one module (see translateEnumValue). Falls back to the raw
 * string if it isn't the shape the interceptor produces — better a visible
 * oddity than a silent crash.
 */
export function renderAuditChanges(changes: string, entity: string): ReactNode {
  let parsed: unknown;
  try {
    parsed = JSON.parse(changes);
  } catch {
    return <p className="audit-fallback">{changes}</p>;
  }

  if (typeof parsed !== "object" || parsed === null || !("submitted" in parsed)) {
    return <p className="audit-fallback">{JSON.stringify(parsed, null, 2)}</p>;
  }

  const { submitted, resultId } = parsed as { submitted: Record<string, unknown>; resultId?: string };

  return (
    <div className="audit-details">
      {renderObject(submitted, entity)}
      {resultId ? (
        <p className="audit-result">
          Identifiant : <span className="tabular">{resultId}</span>
        </p>
      ) : null}
    </div>
  );
}

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

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity.split("/").map(humanize).join(" / ");
}
