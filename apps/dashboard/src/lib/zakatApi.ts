import { api } from "./api";

/** Typed client for /api/zakat. */

export const ZAKAT_METHODOLOGIES = ["LUNAR", "SOLAR"] as const;
export type ZakatMethodology = (typeof ZAKAT_METHODOLOGIES)[number];

export const ZAKAT_METHODOLOGY_LABELS: Record<ZakatMethodology, string> = {
  LUNAR: "Année lunaire (hégirienne) — hawl standard",
  SOLAR: "Année solaire (grégorienne) — méthode alternative",
};

export const ZAKAT_PAYMENT_STATUSES = ["NOT_PAID", "PARTIALLY_PAID", "PAID"] as const;
export type ZakatPaymentStatus = (typeof ZAKAT_PAYMENT_STATUSES)[number];

export const ZAKAT_PAYMENT_STATUS_LABELS: Record<ZakatPaymentStatus, string> = {
  NOT_PAID: "Non payée",
  PARTIALLY_PAID: "Partiellement payée",
  PAID: "Payée",
};

export const GOLD_NISAB_GRAMS = 85;
export const DEFAULT_ZAKAT_RATE = 0.025;

export interface ApiGoldPrice {
  pricePerGram: number;
  source: string;
  fetchedAt: string;
  /** True when a fresh fetch failed and this is the last known cached price. */
  stale: boolean;
}

export interface ZakatAutoPull {
  /** Revenue collected (paid orders) — pre-fills "Banque"; this ERP has no ledger for physical "Caisse". */
  bankValue: number;
  finishedGoodsValue: number;
  rawMaterialsValue: number;
  /** Goods shipped but not yet paid — not the same as "any unpaid order". */
  receivablesValue: number;
  asOf: string;
}

export interface ZakatLive {
  cash: number;
  bank: number;
  finishedGoodsValue: number;
  rawMaterialsValue: number;
  receivablesValue: number;
  otherAssets: number;
  deductions: number;
  goldPricePerGram: number;
  zakatRate: number;
  cashAndBank: number;
  totalAssets: number;
  nisabValue: number;
  zakatableBase: number;
  belowNisab: boolean;
  zakatDue: number;
  asOf: string;
  goldPrice: ApiGoldPrice;
  dueDate: string;
  dueDateHijriLabel: string;
}

export interface ApiZakatCalculation {
  id: string;
  calculationDate: string;
  methodology: ZakatMethodology;
  goldPricePerGram: number;
  cash: number;
  bank: number;
  finishedGoodsValue: number;
  rawMaterialsValue: number;
  receivablesValue: number;
  otherAssets: number;
  deductions: number;
  zakatRate: number;
  amountPaid: number;
  paymentDate: string | null;
  notes: string | null;
  /** Whether this calculation is the one exported to the dashboard — see the "Exporter" action. */
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  // Derived, computed by the backend on every read — never stored.
  cashAndBank: number;
  totalAssets: number;
  nisabValue: number;
  zakatableBase: number;
  belowNisab: boolean;
  zakatDue: number;
  dueDate: string;
  dueDateHijriLabel: string;
  calculationHijriLabel: string;
  remaining: number;
  paymentStatus: ZakatPaymentStatus;
}

export interface CreateZakatCalculationInput {
  calculationDate: string;
  methodology?: ZakatMethodology;
  goldPricePerGram: number;
  cash?: number;
  bank?: number;
  finishedGoodsValue: number;
  rawMaterialsValue: number;
  receivablesValue: number;
  otherAssets?: number;
  deductions?: number;
  zakatRate?: number;
  notes?: string;
}

// --- gold price --------------------------------------------------------

export function fetchGoldPrice(): Promise<ApiGoldPrice> {
  return api.get<ApiGoldPrice>("/zakat/gold-price");
}

export function refreshGoldPrice(): Promise<ApiGoldPrice> {
  return api.post<ApiGoldPrice>("/zakat/gold-price/refresh");
}

export function setManualGoldPrice(pricePerGram: number): Promise<ApiGoldPrice> {
  return api.post<ApiGoldPrice>("/zakat/gold-price/manual", { pricePerGram });
}

// --- auto-pull & live dashboard --------------------------------------------

export function fetchZakatAutoPull(): Promise<ZakatAutoPull> {
  return api.get<ZakatAutoPull>("/zakat/auto-pull");
}

export function fetchZakatLive(): Promise<ZakatLive> {
  return api.get<ZakatLive>("/zakat/live");
}

// --- calculations --------------------------------------------------------

export function fetchZakatCalculations(): Promise<ApiZakatCalculation[]> {
  return api.get<ApiZakatCalculation[]>("/zakat/calculations");
}

export function fetchPinnedZakatCalculation(): Promise<ApiZakatCalculation | null> {
  return api.get<ApiZakatCalculation | null>("/zakat/calculations/pinned");
}

export function createZakatCalculation(input: CreateZakatCalculationInput): Promise<ApiZakatCalculation> {
  return api.post<ApiZakatCalculation>("/zakat/calculations", input);
}

export function updateZakatPayment(
  id: string,
  input: { amountPaid?: number; paymentDate?: string; notes?: string },
): Promise<ApiZakatCalculation> {
  return api.patch<ApiZakatCalculation>(`/zakat/calculations/${id}/payment`, input);
}

/** Exports this calculation to the dashboard — unpins whatever was pinned before it. */
export function pinZakatCalculation(id: string): Promise<ApiZakatCalculation> {
  return api.patch<ApiZakatCalculation>(`/zakat/calculations/${id}/pin`, {});
}

export function unpinZakatCalculation(id: string): Promise<ApiZakatCalculation> {
  return api.patch<ApiZakatCalculation>(`/zakat/calculations/${id}/unpin`, {});
}

export function deleteZakatCalculation(id: string): Promise<{ id: string; deleted: boolean }> {
  return api.del<{ id: string; deleted: boolean }>(`/zakat/calculations/${id}`);
}
