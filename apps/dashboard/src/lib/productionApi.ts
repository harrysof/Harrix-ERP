import { api } from "./api";
import type { ApiItem } from "./stockApi";

/**
 * Typed client for /api/production. Production batches live in the database
 * (unlike Orders and RH, which are still localStorage) — see
 * PROJECT_CONTEXT.md §8.1.
 */

export type ProductionStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "INVESTIGATION" | "CLOSED" | "CANCELLED";

/** French labels for the status strings the backend stores. */
export const STATUS_LABELS: Record<ProductionStatus, string> = {
  PLANNED: "Planifié",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  INVESTIGATION: "Investigation requise",
  CLOSED: "Écart justifié",
  CANCELLED: "Annulé",
};

export const STATUS_ORDER: ProductionStatus[] = ["PLANNED", "IN_PROGRESS", "COMPLETED", "INVESTIGATION", "CLOSED", "CANCELLED"];

export interface ApiConsumption {
  id: string;
  itemId: string;
  stockBatchId: string | null;
  quantity: number;
  movementId: string | null;
  item: { id: string; name: string; unit: string };
  stockBatch: { id: string; batchNumber: string } | null;
}

export interface ApiRates {
  yieldRate: number | null;
  secondChoiceRate: number | null;
  wasteRate: number | null;
  unknownRate: number | null;
}

export interface ApiProductionBatch {
  id: string;
  code: string;
  date: string;
  productItemId: string;
  machine: string;
  supervisor: string | null;
  operator: string | null;
  shift: string;
  startTime: string | null;
  endTime: string | null;
  expectedQuantity: number;
  firstChoice: number;
  secondChoice: number;
  waste: number;
  outputDeclared: boolean;
  status: ProductionStatus;
  varianceNote: string | null;
  notes: string | null;
  outputMovementId: string | null;
  createdAt: string;
  updatedAt: string;
  product: ApiItem;
  consumptions: ApiConsumption[];
  /** Computed by the backend, never stored — see backend production-math.ts. */
  accountedOutput: number;
  unknown: number | null;
  needsInvestigation: boolean;
  rates: ApiRates;
}

export interface LossTotals {
  batchCount: number;
  expected: number;
  firstChoice: number;
  secondChoice: number;
  waste: number;
  accounted: number;
  unknown: number;
  rates: ApiRates;
}

export type LossGroup = LossTotals & { key: string; label: string };

export interface ProductionSummary {
  totals: LossTotals;
  openInvestigations: number;
  runningBatches: number;
  byProduct: LossGroup[];
  byMachine: LossGroup[];
  byPeriod: LossGroup[];
}

export interface FilterOptions {
  machines: string[];
  supervisors: string[];
  operators: string[];
}

export interface BatchFilters {
  from?: string;
  to?: string;
  productItemId?: string;
  machine?: string;
  supervisor?: string;
  status?: string;
}

export interface ConsumptionLineInput {
  itemId: string;
  quantity: number;
  stockBatchId?: string;
}

export interface DeclareOutputInput {
  firstChoice: number;
  secondChoice: number;
  waste: number;
  expectedQuantity?: number;
  varianceNote?: string;
  creditStock?: boolean;
}

export interface CreateBatchInput {
  code?: string;
  date: string;
  productItemId: string;
  machine: string;
  shift: string;
  supervisor?: string;
  operator?: string;
  startTime?: string;
  endTime?: string;
  expectedQuantity: number;
  notes?: string;
  consumptions?: ConsumptionLineInput[];
  output?: DeclareOutputInput;
}

function query(filters: BatchFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function fetchBatches(filters: BatchFilters = {}): Promise<ApiProductionBatch[]> {
  return api.get<ApiProductionBatch[]>(`/production/batches${query(filters)}`);
}

export function fetchBatch(id: string): Promise<ApiProductionBatch> {
  return api.get<ApiProductionBatch>(`/production/batches/${id}`);
}

export function fetchProductionSummary(filters: BatchFilters = {}): Promise<ProductionSummary> {
  return api.get<ProductionSummary>(`/production/summary${query(filters)}`);
}

export function fetchFilterOptions(): Promise<FilterOptions> {
  return api.get<FilterOptions>("/production/filter-options");
}

/**
 * Creates the batch, consumes its materials and credits its output in one
 * server-side transaction — the whole thing lands or none of it does.
 */
export function createBatch(input: CreateBatchInput): Promise<ApiProductionBatch> {
  return api.post<ApiProductionBatch>("/production/batches", input);
}

export function updateBatch(
  id: string,
  input: Partial<Pick<ApiProductionBatch, "date" | "machine" | "shift" | "supervisor" | "operator" | "startTime" | "endTime" | "notes" | "varianceNote" | "status">> & {
    expectedQuantity?: number;
  },
): Promise<ApiProductionBatch> {
  return api.patch<ApiProductionBatch>(`/production/batches/${id}`, input);
}

export function addConsumption(id: string, lines: ConsumptionLineInput[], date?: string): Promise<ApiProductionBatch> {
  return api.post<ApiProductionBatch>(`/production/batches/${id}/consumption`, { lines, date });
}

export function declareOutput(id: string, input: DeclareOutputInput): Promise<ApiProductionBatch> {
  return api.post<ApiProductionBatch>(`/production/batches/${id}/output`, input);
}
