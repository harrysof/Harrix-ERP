import { api } from "./api";
import type { ApiItem, ApiMovement } from "./stockApi";
import type { ApiSupplier } from "./suppliersApi";

/** Typed client for /api/purchasing — §13 supplier detail and §14 purchase orders. */

export type PoStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export const PO_STATUS_LABELS: Record<PoStatus, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Envoyé",
  APPROVED: "Approuvé",
  PARTIALLY_RECEIVED: "Partiellement reçu",
  RECEIVED: "Reçu",
  CANCELLED: "Annulé",
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

export interface PoTotals {
  subtotal: number;
  shipping: number;
  discount: number;
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
  shipping: number;
  discount: number;
  taxRate: number;
  notes: string | null;
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
    lastPurchaseDate: string | null;
  };
}

export interface PoFilters {
  supplierId?: string;
  status?: string;
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
  shipping?: number;
  discount?: number;
  taxRate?: number;
  notes?: string;
  lines: PoLineInput[];
}): Promise<ApiPurchaseOrder> {
  return api.post<ApiPurchaseOrder>("/purchasing/orders", input);
}

export function updatePurchaseOrder(
  id: string,
  input: { supplierId?: string; date?: string; expectedDate?: string; shipping?: number; discount?: number; taxRate?: number; notes?: string; lines?: PoLineInput[] },
): Promise<ApiPurchaseOrder> {
  return api.patch<ApiPurchaseOrder>(`/purchasing/orders/${id}`, input);
}

export function setPurchaseOrderStatus(id: string, status: PoStatus): Promise<ApiPurchaseOrder> {
  return api.patch<ApiPurchaseOrder>(`/purchasing/orders/${id}/status`, { status });
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
