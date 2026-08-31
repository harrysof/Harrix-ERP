import { api } from "./api";

/** Typed client for /api/hr — employees, hours worked, absences. */

export const CONTRACT_TYPES = ["CDI", "CDD"] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  CDI: "CDI — durée indéterminée",
  CDD: "CDD — durée déterminée",
};

export const MARITAL_STATUSES = ["CELIBATAIRE", "MARIE", "DIVORCE", "VEUF"] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  CELIBATAIRE: "Célibataire",
  MARIE: "Marié(e)",
  DIVORCE: "Divorcé(e)",
  VEUF: "Veuf/Veuve",
};

export const ABSENCE_TYPES = ["CONGE", "MALADIE", "INJUSTIFIEE"] as const;
export type AbsenceType = (typeof ABSENCE_TYPES)[number];

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  CONGE: "Congé",
  MALADIE: "Maladie",
  INJUSTIFIEE: "Absence injustifiée",
};

export const EXPECTED_HOURS_PER_DAY = 8;

export interface Tenure {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

export interface PayEstimate {
  gross: number;
  cnas: number;
  taxableSalary: number;
  irg: number;
  net: number;
}

export interface ApiEmployee {
  id: string;
  fullName: string;
  phone: string | null;
  address: string | null;
  position: string;
  hireDate: string;
  birthDate: string | null;
  nin: string | null;
  cnasNumber: string | null;
  contractType: ContractType;
  contractEndDate: string | null;
  maritalStatus: MaritalStatus | null;
  dependentChildren: number;
  salary: number;
  bankRib: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  archived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Computed on every read — see backend/src/hr/payroll-math.ts. */
  tenure: Tenure;
  payEstimate: PayEstimate;
}

export interface ApiEmployeeDetail extends ApiEmployee {
  timeEntries: ApiTimeEntry[];
  absences: ApiAbsence[];
}

export interface ApiTimeEntry {
  id: string;
  employeeId: string;
  date: string;
  hoursWorked: number;
  source: "manual" | "device";
  createdAt: string;
  employee?: { id: string; fullName: string };
}

export interface ApiAbsence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  reason: string | null;
  createdAt: string;
  employee?: { id: string; fullName: string };
}

export interface MonthlySummaryRow {
  employeeId: string;
  fullName: string;
  expectedHours: number;
  workedHours: number;
  absences: Record<AbsenceType, number>;
}

export interface MonthlySummary {
  month: string;
  expectedHours: number;
  rows: MonthlySummaryRow[];
}

function query(params: Record<string, string | undefined>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) usp.set(key, value);
  const q = usp.toString();
  return q ? `?${q}` : "";
}

// --- employees ---------------------------------------------------------

export function fetchEmployees(filters: { includeArchived?: boolean; search?: string } = {}): Promise<ApiEmployee[]> {
  return api.get<ApiEmployee[]>(`/hr/employees${query({ includeArchived: filters.includeArchived ? "true" : undefined, search: filters.search })}`);
}

export function fetchEmployee(id: string): Promise<ApiEmployeeDetail> {
  return api.get<ApiEmployeeDetail>(`/hr/employees/${id}`);
}

export interface EmployeeInput {
  fullName: string;
  phone?: string;
  address?: string;
  position: string;
  hireDate: string;
  birthDate?: string;
  nin?: string;
  cnasNumber?: string;
  contractType?: ContractType;
  contractEndDate?: string;
  maritalStatus?: MaritalStatus;
  dependentChildren?: number;
  salary: number;
  bankRib?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export function createEmployee(input: EmployeeInput): Promise<ApiEmployee> {
  return api.post<ApiEmployee>("/hr/employees", input);
}

export function updateEmployee(id: string, input: Partial<EmployeeInput>): Promise<ApiEmployee> {
  return api.patch<ApiEmployee>(`/hr/employees/${id}`, input);
}

export function archiveEmployee(id: string): Promise<ApiEmployee> {
  return api.patch<ApiEmployee>(`/hr/employees/${id}/archive`);
}

export function unarchiveEmployee(id: string): Promise<ApiEmployee> {
  return api.patch<ApiEmployee>(`/hr/employees/${id}/unarchive`);
}

// --- time entries --------------------------------------------------------

export function fetchTimeEntries(filters: { employeeId?: string; from?: string; to?: string } = {}): Promise<ApiTimeEntry[]> {
  return api.get<ApiTimeEntry[]>(`/hr/time-entries${query(filters)}`);
}

export function createTimeEntry(input: { employeeId: string; date: string; hoursWorked: number }): Promise<ApiTimeEntry> {
  return api.post<ApiTimeEntry>("/hr/time-entries", input);
}

export function deleteTimeEntry(id: string): Promise<{ id: string; deleted: boolean }> {
  return api.del<{ id: string; deleted: boolean }>(`/hr/time-entries/${id}`);
}

// --- absences --------------------------------------------------------------

export function fetchAbsences(filters: { employeeId?: string; from?: string; to?: string } = {}): Promise<ApiAbsence[]> {
  return api.get<ApiAbsence[]>(`/hr/absences${query(filters)}`);
}

export function createAbsence(input: {
  employeeId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<ApiAbsence> {
  return api.post<ApiAbsence>("/hr/absences", input);
}

export function deleteAbsence(id: string): Promise<{ id: string; deleted: boolean }> {
  return api.del<{ id: string; deleted: boolean }>(`/hr/absences/${id}`);
}

// --- summary -----------------------------------------------------------

export function fetchMonthlySummary(month: string): Promise<MonthlySummary> {
  return api.get<MonthlySummary>(`/hr/summary?month=${month}`);
}
