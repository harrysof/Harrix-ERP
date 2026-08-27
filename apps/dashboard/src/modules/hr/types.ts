export interface Employee {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  position: string;
  hireDate: string;
  salary: number;
  createdAt: string;
}

/**
 * A generic time-entry ledger, not a single "hours worked" field — so that
 * a future fingerprint clock can write into this same table (source:
 * "device") without reshaping anything. See build plan, Phase 8.
 */
export interface TimeEntry {
  id: string;
  employeeId: string;
  date: string;
  hoursWorked: number;
  source: "manual" | "device";
  createdAt: string;
}

export const ABSENCE_TYPES = ["Congé", "Maladie", "Absence injustifiée"] as const;
export type AbsenceType = (typeof ABSENCE_TYPES)[number];

export interface Absence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
}

export const EXPECTED_HOURS_PER_DAY = 8;
