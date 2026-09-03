import { api } from "./api";
import type { TranslationKey } from "./i18n";
import type { ApiItem, ApiMovement } from "./stockApi";
import type { ApiSupplier } from "./suppliersApi";

/** Typed client for /api/purchasing — §13 supplier detail and §14 purchase orders. */

export type PoStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

/** Catalogue keys, not text — the same status is shown on three screens. */
export const PO_STATUS_LABELS: Record<PoStatus, TranslationKey> = {
  DRAFT: "poStatus.DRAFT",
  SUBMITTED: "poStatus.SUBMITTED",
  APPROVED: "poStatus.APPROVED",
  PARTIALLY_RECEIVED: "poStatus.PARTIALLY_RECEIVED",
  RECEIVED: "poStatus.RECEIVED",
  CANCELLED: "poStatus.CANCELLED",
};

export const PO_STATUS_ORDER: PoStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"];

export const PO_STATUS_TONES: Record<PoStatus, "ok" | "warn" | "danger" | "neutral"> = {
  DRAFT: "neutral",
  SUBMITTED: "neutral",
  APPROVED: "warn",
  PARTIALLY_RECEIVED: "warn",
  RECEIVED: "ok",
  CANCELLED: "neutral",
};

/** Statuses a user may set by hand. RECEIVED/PARTIALLY_RECEIVED are consequences of receipts. */
export const SETTABLE_PO_STATUSES: PoStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "CANCELLED"];

/** Independent of PoStatus above — a supplier can be paid regardless of what has arrived. */
export type PoPaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "CANCELLED";

export const PO_PAYMENT_LABELS: Record<PoPaymentStatus, TranslationKey> = {
  PENDING: "poPayment.PENDING",
  PARTIAL: "poPayment.PARTIAL",
  PAID: "poPayment.PAID",
  CANCELLED: "poPayment.CANCELLED",
};

export const PO_PAYMENT_TONES: Record<PoPaymentStatus, "ok" | "warn" | "danger" | "neutral"> = {
  PENDING: "warn",
  PARTIAL: "warn",
  PAID: "ok",
  CANCELLED: "neutral",
};

export const PO_PAYMENT_STATUSES: PoPaymentStatus[] = ["PENDING", "PARTIAL", "PAID", "CANCELLED"];

export interface ApiPoLine {
  id: string;
  itemId: string;
  quantity: number;
  unitCost: number;
  item: ApiItem;
  /** Computed by the backend, never stored. */
  received: number;
  outstanding: number;
  lineTotal: number;
}

export interface ApiReceipt {
  id: string;
  code: string;
  date: string;
  deliveryNote: string | null;
  notes: string | null;
  lines: Array<{ id: string; purchaseOrderLineId: string; quantity: number; movementId: string | null; batchId: string | null }>;
}

export type DiscountType = "FIXED" | "PERCENT";

export interface PoTotals {
  subtotal: number;
  shipping: number;
  /** Always computed, in DZD. */
  discount: number;
  discountType: DiscountType;
  /** The fraction typed when discountType is PERCENT, e.g. 0.10 for 10 %. Zero for FIXED. */
  discountRate: number;
  /** The rate that produced `tax`, e.g. 0.19 for 19 %. */
  taxRate: number;
  /** Always computed by the backend from `taxRate` — never typed directly. */
  tax: number;
  total: number;
}

export interface ApiPurchaseOrder {
  id: string;
  code: string;
  supplierId: string;
  supplier: ApiSupplier;
  date: string;
  expectedDate: string | null;
  status: PoStatus;
  paymentStatus: PoPaymentStatus;
  /** How much has actually been paid to the supplier so far, in DZD. */
  amountPaid: number;
  /** What's still owed to the supplier — totals.total minus amountPaid, never negative. */
  balanceDue: number;
  shipping: number;
  /** A DZD amount when discountType is FIXED, or a fraction (0.10 for 10 %) when it's PERCENT — the DZD amount always lives on `totals.discount`. */
  discount: number;
  discountType: DiscountType;
  taxRate: number;
  notes: string | null;
  /** The invoice/bon de commande attached to this order, if any (PDF, Word or image). */
  invoiceFileName: string | null;
  /** A data-URI holding the attached file's bytes. */
  invoiceFileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lines: ApiPoLine[];
  receipts: ApiReceipt[];
  totals: PoTotals;
}

export interface SupplierDetail {
  supplier: ApiSupplier;
  suppliedItems: Array<{ id: string; name: string; reference: string; unit: string; lastUnitCost: number | null; lastDate: string | null }>;
  purchaseOrders: ApiPurchaseOrder[];
  receipts: Array<{ id: string; code: string; date: string; deliveryNote: string | null; purchaseOrderId: string; purchaseOrderCode: string; lineCount: number; quantity: number }>;
  movements: ApiMovement[];
  summary: {
    purchaseOrderCount: number;
    openPurchaseOrderCount: number;
    totalPurchased: number;
    outstandingCommitment: number;
    /** Accounts payable — what's still owed to this supplier, in money. */
    amountOwed: number;
    lastPurchaseDate: string | null;
  };
}

export interface PoFilters {
  supplierId?: string;
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
}

export interface PoLineInput {
  itemId: string;
  quantity: number;
  unitCost: number;
}

export interface ReceiptLineInput {
  purchaseOrderLineId: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
}

function query(filters: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, String(value));
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function fetchPurchaseOrders(filters: PoFilters = {}): Promise<ApiPurchaseOrder[]> {
  return api.get<ApiPurchaseOrder[]>(`/purchasing/orders${query(filters)}`);
}

export function fetchPurchaseOrder(id: string): Promise<ApiPurchaseOrder> {
  return api.get<ApiPurchaseOrder>(`/purchasing/orders/${id}`);
}

export function fetchSupplierDetail(id: string): Promise<SupplierDetail> {
  return api.get<SupplierDetail>(`/purchasing/suppliers/${id}`);
}

export function createPurchaseOrder(input: {
  supplierId: string;
  date: string;
  expectedDate?: string;
  status?: string;
  /** A deposit paid to the supplier at order time. paymentStatus is derived from it. */
  amountPaid?: number;
  shipping?: number;
  discount?: number;
  discountType?: DiscountType;
  taxRate?: number;
  notes?: string;
  invoiceFileName?: string;
  invoiceFileUrl?: string;
  lines: PoLineInput[];
}): Promise<ApiPurchaseOrder> {
  return api.post<ApiPurchaseOrder>("/purchasing/orders", input);
}

export function updatePurchaseOrder(
  id: string,
  input: {
    supplierId?: string;
    date?: string;
    expectedDate?: string;
    shipping?: number;
    discount?: number;
    discountType?: DiscountType;
    taxRate?: number;
    notes?: string;
    /** Empty string removes the attachment. */
    invoiceFileName?: string;
    invoiceFileUrl?: string;
    lines?: PoLineInput[];
  },
): Promise<ApiPurchaseOrder> {
  return api.patch<ApiPurchaseOrder>(`/purchasing/orders/${id}`, input);
}

export function setPurchaseOrderStatus(id: string, status: PoStatus): Promise<ApiPurchaseOrder> {
  return api.patch<ApiPurchaseOrder>(`/purchasing/orders/${id}/status`, { status });
}

/** Adds to amountPaid — "half now, the rest later" — never a status typed directly. */
export function recordPurchasePayment(id: string, input: { amount: number; date?: string }): Promise<ApiPurchaseOrder> {
  return api.post<ApiPurchaseOrder>(`/purchasing/orders/${id}/payments`, input);
}

/** Posting a delivery — the only purchasing action that moves stock. */
export function receivePurchaseOrder(
  id: string,
  input: { date: string; lines: ReceiptLineInput[]; deliveryNote?: string; notes?: string; allowOverDelivery?: boolean },
): Promise<ApiPurchaseOrder> {
  return api.post<ApiPurchaseOrder>(`/purchasing/orders/${id}/receive`, input);
}

export function deletePurchaseOrder(id: string) {
  return api.del<{ id: string; deleted: boolean }>(`/purchasing/orders/${id}`);
}
