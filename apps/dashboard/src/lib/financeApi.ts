import { api } from "./api";

/**
 * Finance — the cost register and what it says a product costs.
 *
 * Every figure here is computed on read by the backend
 * (backend/src/finance/finance-math.ts). Nothing is a stored total, which is
 * why the API returns the divisor alongside every division: the screen is
 * meant to show its work, not just its answer.
 */

export const COST_NATURES = ["DIRECT", "INDIRECT"] as const;
export type CostNature = (typeof COST_NATURES)[number];

export const COST_NATURE_LABELS: Record<CostNature, string> = {
  DIRECT: "Direct",
  INDIRECT: "Indirect",
};

export const COST_NATURE_HINTS: Record<CostNature, string> = {
  DIRECT: "Rattachable à un produit précis — cuir, façon, sous-traitance.",
  INDIRECT: "À répartir sur tout ce qui est produit — loyer, énergie, administration.",
};

export const COST_BEHAVIORS = ["FIXED", "VARIABLE"] as const;
export type CostBehavior = (typeof COST_BEHAVIORS)[number];

export const COST_BEHAVIOR_LABELS: Record<CostBehavior, string> = {
  FIXED: "Fixe",
  VARIABLE: "Variable",
};

export const COST_BEHAVIOR_HINTS: Record<CostBehavior, string> = {
  FIXED: "Le même montant que l'usine tourne ou non.",
  VARIABLE: "Monte et descend avec le volume produit.",
};

export const ALLOCATION_BASES = ["UNITS", "MATERIAL_COST"] as const;
export type AllocationBasis = (typeof ALLOCATION_BASES)[number];

export const ALLOCATION_BASIS_LABELS: Record<AllocationBasis, string> = {
  UNITS: "Au prorata des unités produites",
  MATERIAL_COST: "Au prorata du coût des matières",
};

export const ALLOCATION_BASIS_HINTS: Record<AllocationBasis, string> = {
  UNITS: "Chaque paire porte la même part du loyer. Le choix honnête quand les modèles demandent un travail comparable.",
  MATERIAL_COST:
    "Un modèle en cuir cher absorbe une plus grande part des charges. Utile quand la gamme est très inégale, trompeur quand une matière chère est rapide à travailler.",
};

export interface FinanceWarning {
  code:
    | "NO_PRODUCTION"
    | "NO_ALLOCATION_BASE"
    | "UNCOSTED_MATERIALS"
    | "MATERIALS_OVERRIDDEN"
    | "OVERRIDE_NOT_DISTRIBUTABLE"
    | "UNATTRIBUTED_DIRECT"
    | "NO_PRICE_SET";
  message: string;
}

export interface CostCategory {
  id: string;
  key: string;
  label: string;
  description: string;
  nature: CostNature;
  behavior: CostBehavior;
  /** Summed from production instead of typed — the one category with no input. */
  isMaterials: boolean;
  /** Seeded: renameable, not deletable. */
  isProtected: boolean;
  sortOrder: number;
}

export interface CostEntry {
  id: string;
  categoryId: string;
  label: string;
  amount: number;
  date: string;
  productItemId: string | null;
  notes: string | null;
  category: { id: string; key: string; label: string; nature: CostNature; behavior: CostBehavior };
  productItem: { id: string; name: string; reference: string } | null;
}

export interface MaterialOverride {
  id: string;
  month: string;
  amount: number;
  reason: string;
}

export interface RegisterLine {
  categoryId: string;
  key: string;
  label: string;
  nature: CostNature;
  behavior: CostBehavior;
  amount: number;
  entryCount: number;
  derived: boolean;
  /** Materials only: the figure before any correction. Always kept visible. */
  computedAmount: number | null;
  override: { amount: number; reason: string } | null;
}

export interface RegisterTotals {
  direct: number;
  indirect: number;
  fixed: number;
  variable: number;
  total: number;
}

export interface AllocationDetail {
  basis: AllocationBasis;
  basisLabel: string;
  /** The pooled charges being shared out. */
  pool: number;
  divisor: number;
  divisorLabel: string;
  /** pool ÷ divisor — the division the screen prints in full. */
  ratePerUnitOfBasis: number | null;
}

export interface ProductCosting {
  productItemId: string;
  name: string;
  reference: string;
  unit: string;
  photoUrl: string | null;

  unitsProduced: number;
  materialCost: number | null;
  directCost: number;
  indirectShare: number | null;

  materialUnitCost: number | null;
  directUnitCost: number | null;
  indirectUnitCost: number | null;
  /** The three above, added. Null when it cannot honestly be computed. */
  unitCost: number | null;

  margin: number;
  marginIsOverride: boolean;
  suggestedPrice: number | null;

  currentPrice: number | null;
  currentMarkup: number | null;
  currentMarginOnPrice: number | null;

  warnings: FinanceWarning[];
}

export interface FinanceSettings {
  id: string;
  defaultMargin: number;
  allocationBasis: AllocationBasis;
}

export interface FinanceOverview {
  period: { months: string[]; from: string; to: string; label: string };
  settings: FinanceSettings;
  register: { lines: RegisterLine[]; totals: RegisterTotals; warnings: FinanceWarning[] };
  production: {
    totalUnits: number;
    computedMaterialCost: number;
    batchCount: number;
    uncostedLineCount: number;
  };
  allocation: AllocationDetail;
  products: ProductCosting[];
  warnings: FinanceWarning[];
  overrides: MaterialOverride[];
}

export interface PeriodQuery {
  month?: string;
  from?: string;
  to?: string;
}

function periodQuery(period: PeriodQuery): string {
  const params = new URLSearchParams();
  if (period.month) params.set("month", period.month);
  if (period.from) params.set("from", period.from);
  if (period.to) params.set("to", period.to);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function fetchOverview(period: PeriodQuery) {
  return api.get<FinanceOverview>(`/finance/overview${periodQuery(period)}`);
}

export function fetchCostCategories() {
  return api.get<CostCategory[]>("/finance/categories");
}

export interface CostCategoryInput {
  key?: string;
  label: string;
  description?: string;
  nature: CostNature;
  behavior: CostBehavior;
  sortOrder?: number;
}

export function createCostCategory(input: CostCategoryInput & { key: string }) {
  return api.post<CostCategory>("/finance/categories", input);
}

export function updateCostCategory(id: string, input: Partial<Omit<CostCategoryInput, "key">>) {
  return api.patch<CostCategory>(`/finance/categories/${id}`, input);
}

export function deleteCostCategory(id: string) {
  return api.del<{ id: string; deleted: boolean }>(`/finance/categories/${id}`);
}

export function fetchCostEntries(period: PeriodQuery) {
  return api.get<CostEntry[]>(`/finance/entries${periodQuery(period)}`);
}

export interface CostEntryInput {
  categoryId: string;
  label: string;
  amount: number;
  date: string;
  productItemId?: string | null;
  notes?: string;
}

export function createCostEntry(input: CostEntryInput) {
  return api.post<CostEntry>("/finance/entries", input);
}

export function updateCostEntry(id: string, input: Partial<CostEntryInput>) {
  return api.patch<CostEntry>(`/finance/entries/${id}`, input);
}

export function deleteCostEntry(id: string) {
  return api.del<{ id: string; deleted: boolean }>(`/finance/entries/${id}`);
}

/** Copy a month's charges forward, so the rent is typed once rather than twelve times. */
export function duplicateMonth(input: { from: string; to: string; fixedOnly?: boolean }) {
  return api.post<{ from: string; to: string; created: number }>("/finance/entries/duplicate", input);
}

export function setMaterialOverride(input: { month: string; amount: number; reason: string }) {
  return api.put<MaterialOverride>("/finance/material-override", input);
}

export function clearMaterialOverride(month: string) {
  return api.del<{ month: string; deleted: boolean }>(`/finance/material-override/${month}`);
}

export function updateFinanceSettings(input: Partial<Pick<FinanceSettings, "defaultMargin" | "allocationBasis">>) {
  return api.patch<FinanceSettings>("/finance/settings", input);
}

export function setProductMargin(itemId: string, targetMargin: number | null) {
  return api.patch<{ id: string; name: string; targetMargin: number | null }>(`/finance/products/${itemId}/margin`, {
    targetMargin,
  });
}

// ---------------------------------------------------------------------------
// Month helpers — the accounting unit, kept as "YYYY-MM" strings
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  return `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

/** `offset` months away from `month`. -1 is the previous month. */
export function shiftMonth(month: string, offset: number): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1 + offset;
  const date = new Date(Date.UTC(year, index, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The first day of a month, for date inputs that default inside the period. */
export function firstDayOf(month: string): string {
  return `${month}-01`;
}

/** A rate as the factory reads it: 0.2537 -> "25,4 %". */
export function formatRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${(rate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}
