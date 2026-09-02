import { api } from "./api";

/** Typed client for /api/finance — the factory-costs ledger. */

export interface ApiFactoryCost {
  id: string;
  label: string;
  amount: number;
  date: string;
  createdAt: string;
}

export interface MonthlyCosts {
  month: string;
  total: number;
  costs: ApiFactoryCost[];
}

export function fetchFactoryCosts(month: string): Promise<MonthlyCosts> {
  return api.get<MonthlyCosts>(`/finance/costs?month=${month}`);
}

export function fetchMonthsWithCosts(): Promise<string[]> {
  return api.get<string[]>("/finance/costs/months");
}

export function createFactoryCost(input: { label: string; amount: number; date: string }): Promise<ApiFactoryCost> {
  return api.post<ApiFactoryCost>("/finance/costs", input);
}

export function deleteFactoryCost(id: string): Promise<{ id: string; deleted: boolean }> {
  return api.del<{ id: string; deleted: boolean }>(`/finance/costs/${id}`);
}

export function copyFactoryCosts(from: string, to: string): Promise<MonthlyCosts> {
  return api.post<MonthlyCosts>("/finance/costs/copy", { from, to });
}
