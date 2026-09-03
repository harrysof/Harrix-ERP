import { api } from "./api";

/**
 * The tableau de bord's data, for one calendar month.
 *
 * Every section is nullable on purpose: the backend builds only the parts the
 * caller's role may see and returns `null` for the rest (see
 * analytics.service.ts). A null section means "not permitted", never "zero" —
 * the page renders nothing for it rather than an empty chart that would read
 * as "the factory sold nothing".
 */

export interface AnalyticsProduct {
  itemId: string;
  name: string;
  reference: string;
  unit: string;
  quantity: number;
  revenue: number;
}

export interface AnalyticsCustomer {
  customerId: string;
  name: string;
  orderCount: number;
  revenue: number;
}

export interface AnalyticsSales {
  revenue: number;
  collected: number;
  outstanding: number;
  orderCount: number;
  shippedCount: number;
  quantitySold: number;
  averageOrderValue: number;
  materialCost: number;
  uncostedLines: number;
  returnedValue: number;
  returnedQuantity: number;
  topProducts: AnalyticsProduct[];
  topProductsByQuantity: AnalyticsProduct[];
  topCustomers: AnalyticsCustomer[];
}

export interface AnalyticsStock {
  asOf: string;
  totalItems: number;
  stockValue: number;
  lowStockCount: number;
  lowStockItems: Array<{
    id: string;
    name: string;
    reference: string;
    unit: string;
    quantity: number;
    reorderThreshold: number;
    inventoryTypeLabel: string;
  }>;
  valueByType: Array<{ id: string; label: string; value: number; itemCount: number }>;
}

export interface AnalyticsMaterialFlow {
  itemId: string;
  name: string;
  reference: string;
  unit: string;
  quantity: number;
  value: number;
}

export interface AnalyticsMaterials {
  purchasedValue: number;
  consumedValue: number;
  mostBought: AnalyticsMaterialFlow[];
  mostUsed: AnalyticsMaterialFlow[];
  mostExpensive: Array<{ itemId: string; name: string; reference: string; unit: string; unitCost: number }>;
}

export interface AnalyticsCosts {
  total: number;
  entryCount: number;
  /** Cash that went into stock this month — reported beside the result, never inside it. */
  purchases: number;
  biggest: { id: string; label: string; amount: number; date: string } | null;
  byLabel: Array<{ label: string; amount: number }>;
}

export interface AnalyticsHr {
  headcount: number;
  payrollGross: number;
  payrollNet: number;
  hoursWorked: number;
  absenceDays: number;
  topPaid: Array<{ employeeId: string; name: string; position: string; gross: number; net: number }>;
  topHours: Array<{ employeeId: string; name: string; position: string; hours: number }>;
}

export interface AnalyticsZakat {
  /** "pinned" is a figure a human committed to; "live" is the automatic estimate. */
  source: "pinned" | "live";
  zakatDue: number;
  zakatableBase: number;
  totalAssets: number;
  nisabValue: number;
  belowNisab: boolean;
  amountPaid: number;
  remaining: number;
  paymentStatus: string;
  dueDate: string;
  dueDateHijriLabel: string;
  asOf: string;
}

export interface AnalyticsTrendPoint {
  month: string;
  label: string;
  orderCount: number;
  quantity: number;
  revenue: number;
  materialCost: number;
  payrollCost: number;
  factoryCost: number;
  totalCost: number;
  profit: number;
  marginRate: number | null;
}

export interface AnalyticsResult {
  revenue: number;
  materialCost: number;
  payrollCost: number;
  factoryCost: number;
  totalCost: number;
  profit: number;
  marginRate: number | null;
}

export interface AnalyticsDashboard {
  month: string;
  monthLabel: string;
  availableMonths: string[];
  generatedAt: string;
  result: AnalyticsResult | null;
  trend: {
    points: AnalyticsTrendPoint[];
    deltas: { revenue: number | null; totalCost: number | null; profit: number | null; quantity: number | null } | null;
  } | null;
  sales: AnalyticsSales | null;
  stock: AnalyticsStock | null;
  materials: AnalyticsMaterials | null;
  costs: AnalyticsCosts | null;
  hr: AnalyticsHr | null;
  zakat: AnalyticsZakat | null;
}

export function fetchDashboard(month?: string): Promise<AnalyticsDashboard> {
  return api.get<AnalyticsDashboard>(`/analytics/dashboard${month ? `?month=${encodeURIComponent(month)}` : ""}`);
}

// ---------------------------------------------------------------------------
// Month helpers — the picker's vocabulary
// ---------------------------------------------------------------------------

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

/** The month `offset` months away from `month` — the ‹ › arrows either side of the picker. */
export function shiftMonth(month: string, offset: number): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + offset, 1)).toISOString().slice(0, 7);
}

/** The distinct years present in a month list, newest first — the year selector. */
export function yearsOf(months: string[]): number[] {
  return [...new Set(months.map((m) => Number(m.slice(0, 4))))].sort((a, b) => b - a);
}
