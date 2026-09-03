import type { ReactNode } from "react";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { CONTRACT_TYPE_LABELS, MARITAL_STATUS_LABELS, ABSENCE_TYPE_LABELS } from "../../lib/hrApi";
import { STATUS_LABELS as PRODUCTION_STATUS_LABELS } from "../../lib/productionApi";
import { PO_STATUS_LABELS } from "../../lib/purchasingApi";
import { SHIPMENT_LABELS, PAYMENT_LABELS } from "../../lib/salesApi";
import { useI18n } from "../../state/LanguageContext";
import type { TranslationKey } from "../../lib/i18n";

/**
 * The audit log stores exactly what was submitted to the API — see backend
 * audit.interceptor.ts's serializeChanges. It never captures the value
 * *before* a change, only the request body, so this can render "what was
 * set" but never "what changed from what". Field keys are the DTOs' own
 * camelCase names; this dictionary is what turns them into something the
 * gérant can actually read.
 */
const FIELD_LABELS: Record<string, TranslationKey> = {
  // identity / people
  fullName: "audit.field.fullName",
  login: "audit.field.login",
  phone: "audit.field.phone",
  email: "audit.field.email",
  address: "audit.field.address",
  contactName: "audit.field.contactName",
  registration: "audit.field.registration",
  roleId: "audit.field.roleId",

  // HR
  position: "audit.field.position",
  hireDate: "audit.field.hireDate",
  birthDate: "audit.field.birthDate",
  nin: "audit.field.nin",
  cnasNumber: "audit.field.cnasNumber",
  contractType: "audit.field.contractType",
  contractEndDate: "audit.field.contractEndDate",
  maritalStatus: "audit.field.maritalStatus",
  dependentChildren: "audit.field.dependentChildren",
  salary: "audit.field.salary",
  bankRib: "audit.field.bankRib",
  emergencyContactName: "audit.field.emergencyContactName",
  emergencyContactPhone: "audit.field.emergencyContactPhone",
  employeeId: "audit.field.employeeId",
  startDate: "audit.field.startDate",
  endDate: "audit.field.endDate",
  reason: "audit.field.reason",
  hoursWorked: "audit.field.hoursWorked",
  source: "audit.field.source",

  // stock / articles
  name: "audit.field.name",
  reference: "audit.field.reference",
  unit: "audit.field.unit",
  reorderThreshold: "audit.field.reorderThreshold",
  photoUrl: "audit.field.photoUrl",
  color: "audit.field.color",
  size: "audit.field.size",
  description: "audit.field.description",
  compatibility: "audit.field.compatibility",
  manufacturer: "audit.field.manufacturer",
  location: "audit.field.location",
  criticality: "audit.field.criticality",
  gender: "audit.field.gender",
  price: "audit.field.price",
  unitCost: "audit.field.unitCost",
  itemId: "audit.field.itemId",
  batchId: "audit.field.batchId",
  batchNumber: "audit.field.batchNumber",
  stockBatchId: "audit.field.stockBatchId",
  expiryDate: "audit.field.expiryDate",
  maintenanceRef: "audit.field.maintenanceRef",
  employee: "audit.field.employee",
  quality: "audit.field.quality",
  quantity: "audit.field.quantity",

  // production
  productItemId: "audit.field.productItemId",
  machine: "audit.field.machine",
  shift: "audit.field.shift",
  supervisor: "audit.field.supervisor",
  operator: "audit.field.operator",
  startTime: "audit.field.startTime",
  endTime: "audit.field.endTime",
  firstChoice: "audit.field.firstChoice",
  secondChoice: "audit.field.secondChoice",
  waste: "audit.field.waste",
  expectedQuantity: "audit.field.expectedQuantity",
  varianceNote: "audit.field.varianceNote",
  creditStock: "audit.field.creditStock",

  // purchasing / suppliers
  supplierId: "audit.field.supplierId",
  orderDate: "audit.field.orderDate",
  expectedDate: "audit.field.expectedDate",
  deliveryNote: "audit.field.deliveryNote",
  allowOverDelivery: "audit.field.allowOverDelivery",
  purchaseOrderLineId: "audit.field.purchaseOrderLineId",
  quantityOrdered: "audit.field.quantityOrdered",
  lineId: "audit.field.lineId",

  // sales
  customerId: "audit.field.customerId",
  code: "audit.field.code",
  date: "audit.field.date",
  status: "audit.field.status",
  shipmentStatus: "audit.field.shipmentStatus",
  paymentStatus: "audit.field.paymentStatus",
  shipping: "audit.field.shipping",
  discount: "audit.field.discount",
  discountType: "audit.field.discountType",
  tax: "audit.field.tax",
  taxRate: "audit.field.taxRate",
  unitPrice: "audit.field.unitPrice",
  markPaid: "audit.field.markPaid",
  shipToName: "audit.field.shipToName",
  shipToPhone: "audit.field.shipToPhone",
  shipToEmail: "audit.field.shipToEmail",
  shipToAddress: "audit.field.shipToAddress",
  shipToCity: "audit.field.shipToCity",
  shipToProvince: "audit.field.shipToProvince",
  shipToCountry: "audit.field.shipToCountry",

  // settings / roles / structural
  key: "audit.field.key",
  label: "audit.field.label",
  singular: "audit.field.singular",
  defaultUnit: "audit.field.defaultUnit",
  sortOrder: "audit.field.sortOrder",
  permissions: "audit.field.permissions",
  notes: "audit.field.notes",
  lines: "audit.field.lines",
  consumptions: "audit.field.consumptions",
  output: "audit.field.output",
  inventoryTypeId: "audit.field.inventoryTypeId",
  type: "audit.field.type",

  // auth (always redacted to "***" server-side, kept so the label still reads well)
  password: "audit.field.password",
  currentPassword: "audit.field.currentPassword",
  newPassword: "audit.field.newPassword",
};

const MONEY_FIELDS = new Set(["salary", "unitCost", "price", "shipping", "discount", "tax", "unitPrice"]);
const DATE_FIELDS = new Set(["startDate", "endDate", "hireDate", "birthDate", "contractEndDate", "date", "expiryDate", "expectedDate", "orderDate"]);

/**
 * Enum-ish fields whose raw value is a backend status code (e.g. "CANCELLED",
 * "PARTIALLY_RECEIVED") rather than something meant to be read as-is. Most
 * are unambiguous; "status" and "type" are shared by more than one entity, so
 * those two need the audit entry's `entity` to pick the right dictionary.
 */
const DISCOUNT_TYPE_LABELS: Record<string, TranslationKey> = {
  FIXED: "audit.discount.FIXED",
  PERCENT: "audit.discount.PERCENT",
};

/** The translator, threaded through the render helpers below (they are plain
 *  functions, not components, so they cannot call the hook themselves). */
type T = (key: TranslationKey, vars?: Record<string, string | number>) => string;

function translateEnumValue(key: string, value: string, entity: string, t: T): string {
  const at = (map: Record<string, TranslationKey>): string => {
    const found = map[value];
    return found ? t(found) : value;
  };
  switch (key) {
    case "discountType":
      return at(DISCOUNT_TYPE_LABELS);
    case "contractType":
      return at(CONTRACT_TYPE_LABELS);
    case "maritalStatus":
      return at(MARITAL_STATUS_LABELS);
    case "shipmentStatus":
      return at(SHIPMENT_LABELS);
    case "paymentStatus":
      return at(PAYMENT_LABELS);
    case "type":
      return entity === "hr/absences" ? at(ABSENCE_TYPE_LABELS) : value;
    case "status":
      if (entity === "production/batches") return at(PRODUCTION_STATUS_LABELS);
      if (entity === "purchasing/orders") return at(PO_STATUS_LABELS);
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

function fieldLabel(key: string, t: T): string {
  const label = FIELD_LABELS[key];
  return label ? t(label) : humanize(key);
}

function renderValue(key: string, value: unknown, entity: string, t: T, siblings?: Record<string, unknown>): ReactNode {
  if (value === null || value === undefined || value === "") return <span className="muted">—</span>;

  if (typeof value === "boolean") return t(value ? "state.yes" : "state.no");

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="muted">—</span>;
    if (value.every((v) => typeof v !== "object" || v === null)) return value.join(", ");
    return (
      <ol className="audit-sublist">
        {value.map((item, i) => (
          <li key={i}>{renderObject(item as Record<string, unknown>, entity, t)}</li>
        ))}
      </ol>
    );
  }

  if (typeof value === "object") return renderObject(value as Record<string, unknown>, entity, t);

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
    return translateEnumValue(key, value, entity, t);
  }

  return String(value);
}

function renderObject(obj: Record<string, unknown>, entity: string, t: T): ReactNode {
  const entries = Object.entries(obj);
  if (entries.length === 0) return <span className="muted">—</span>;
  return (
    <div className="audit-fields">
      {entries.map(([key, value]) => (
        <div key={key} className="audit-field">
          <span className="audit-field-label">{fieldLabel(key, t)}</span>
          <span className="audit-field-value">{renderValue(key, value, entity, t, obj)}</span>
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
export function AuditChanges({ changes, entity }: { changes: string; entity: string }): ReactNode {
  const { t } = useI18n();
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
      {renderObject(submitted, entity, t)}
      {resultId ? (
        <p className="audit-result">
          {t("adm.identifier")}
          <span className="tabular">{resultId}</span>
        </p>
      ) : null}
    </div>
  );
}

export { entityLabel } from "../../lib/auditLabels";
