import { api } from "./api";
import type { ApiItem } from "./stockApi";

/** Typed client for /api/sales — §15–19: orders, order details, customers. */

export type ShipmentStatus = "PENDING" | "SHIPPED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "CANCELLED";

export const SHIPMENT_LABELS: Record<ShipmentStatus, string> = {
  PENDING: "En attente",
  SHIPPED: "Expédié",
  CANCELLED: "Annulé",
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  PENDING: "En attente",
  PAID: "Payé",
  CANCELLED: "Annulé",
};

export const SHIPMENT_TONES: Record<ShipmentStatus, "ok" | "warn" | "danger" | "neutral"> = {
  PENDING: "warn",
  SHIPPED: "ok",
  CANCELLED: "neutral",
};

export const PAYMENT_TONES: Record<PaymentStatus, "ok" | "warn" | "danger" | "neutral"> = {
  PENDING: "warn",
  PAID: "ok",
  CANCELLED: "neutral",
};

export const SHIPMENT_STATUSES: ShipmentStatus[] = ["PENDING", "SHIPPED", "CANCELLED"];
export const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "PAID", "CANCELLED"];

export interface ApiCustomer {
  id: string;
  code: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  postalCode: string | null;
  notes: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  /** §19 summaries, computed by the backend. */
  orderCount: number;
  totalPurchased: number;
  outstandingBalance: number;
}

export interface ApiOrderLine {
  id: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  movementId: string | null;
  item: ApiItem;
  lineTotal: number;
}

export interface OrderTotals {
  subtotal: number;
  lineDiscounts: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
}

export interface ApiOrder {
  id: string;
  code: string;
  customerId: string;
  customer: ApiCustomer;
  date: string;
  shipmentStatus: ShipmentStatus;
  paymentStatus: PaymentStatus;
  shipping: number;
  discount: number;
  tax: number;
  notes: string | null;
  shipToName: string | null;
  shipToPhone: string | null;
  shipToEmail: string | null;
  shipToAddress: string | null;
  shipToCity: string | null;
  shipToProvince: string | null;
  shipToCountry: string | null;
  shipToPostalCode: string | null;
  shippedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: ApiOrderLine[];
  totals: OrderTotals;
  /** What the backend will actually permit — the UI mirrors these, never guesses. */
  canEdit: boolean;
  canShip: boolean;
  canCancel: boolean;
  /**
   * Lines that could not be shipped right now. A warning, not a block —
   * the factory takes orders it intends to produce next week. Empty for
   * anything already shipped or cancelled.
   */
  stockWarnings: Array<{ itemId: string; itemName: string; unit: string; required: number; available: number }>;
}

export interface CustomerDetail extends Omit<ApiCustomer, "orderCount" | "totalPurchased" | "outstandingBalance"> {
  summary: { orderCount: number; totalPurchased: number; outstandingBalance: number };
  orders: ApiOrder[];
}

export interface OrdersSummary {
  orderCount: number;
  pendingShipment: number;
  shipped: number;
  cancelled: number;
  revenue: number;
  outstanding: number;
}

export interface OrderFilters {
  customerId?: string;
  shipmentStatus?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface OrderLineInput {
  itemId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface CustomerInput {
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
}

function query(filters: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, String(value));
  const q = params.toString();
  return q ? `?${q}` : "";
}

// ------------------------------------------------------------------ customers

export function fetchCustomers(includeArchived = false): Promise<ApiCustomer[]> {
  return api.get<ApiCustomer[]>(`/sales/customers${includeArchived ? "?includeArchived=true" : ""}`);
}

export function fetchCustomer(id: string): Promise<CustomerDetail> {
  return api.get<CustomerDetail>(`/sales/customers/${id}`);
}

export function createCustomer(input: CustomerInput): Promise<ApiCustomer> {
  return api.post<ApiCustomer>("/sales/customers", input);
}

export function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<CustomerDetail> {
  return api.patch<CustomerDetail>(`/sales/customers/${id}`, input);
}

export function setCustomerArchived(id: string, archived: boolean): Promise<CustomerDetail> {
  return api.patch<CustomerDetail>(`/sales/customers/${id}/${archived ? "archive" : "unarchive"}`, {});
}

export function deleteCustomer(id: string) {
  return api.del<{ id: string; deleted: boolean }>(`/sales/customers/${id}`);
}

// --------------------------------------------------------------------- orders

export function fetchOrders(filters: OrderFilters = {}): Promise<ApiOrder[]> {
  return api.get<ApiOrder[]>(`/sales/orders${query(filters)}`);
}

export function fetchOrder(id: string): Promise<ApiOrder> {
  return api.get<ApiOrder>(`/sales/orders/${id}`);
}

export function fetchOrdersSummary(filters: OrderFilters = {}): Promise<OrdersSummary> {
  return api.get<OrdersSummary>(`/sales/orders/summary${query(filters)}`);
}

/**
 * Note there is no `total` field to send: §16's totals are computed by the
 * server from the lines, so a client's arithmetic can never override them.
 */
export function createOrder(input: {
  customerId: string;
  date: string;
  shipmentStatus?: string;
  paymentStatus?: string;
  shipping?: number;
  discount?: number;
  tax?: number;
  notes?: string;
  lines: OrderLineInput[];
  shipToName?: string;
  shipToPhone?: string;
  shipToEmail?: string;
  shipToAddress?: string;
  shipToCity?: string;
  shipToProvince?: string;
  shipToCountry?: string;
  shipToPostalCode?: string;
}): Promise<ApiOrder> {
  return api.post<ApiOrder>("/sales/orders", input);
}

export function updateOrder(id: string, input: Record<string, unknown>): Promise<ApiOrder> {
  return api.patch<ApiOrder>(`/sales/orders/${id}`, input);
}

export function setOrderStatus(id: string, input: { shipmentStatus?: string; paymentStatus?: string }): Promise<ApiOrder> {
  return api.patch<ApiOrder>(`/sales/orders/${id}/status`, input);
}

/** The only sales action that moves stock. */
export function shipOrder(id: string, input: { date?: string; markPaid?: boolean } = {}): Promise<ApiOrder> {
  return api.post<ApiOrder>(`/sales/orders/${id}/ship`, input);
}

export function deleteOrder(id: string) {
  return api.del<{ id: string; deleted: boolean }>(`/sales/orders/${id}`);
}
