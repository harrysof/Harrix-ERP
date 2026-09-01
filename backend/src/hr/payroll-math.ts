/**
 * HR arithmetic — no Nest, no Prisma, no Date.now(), like stock-math.ts and
 * the other pure modules. Unit tested in payroll-math.spec.ts.
 *
 * Two things are computed here rather than stored, for the usual reason:
 * seniority (tenure) drifts the instant it is read on a different day than it
 * was written, and payroll deductions drift the instant a salary changes. So
 * `hireDate` and `salary` are the only facts on an Employee row — everything
 * else on this page is derived from them when the screen is opened.
 *
 * IRG is the one exception to "compute it and trust it": Algerian income tax
 * is genuinely intricate (a progressive schedule with a smoothing "décote" at
 * the low end of each bracket that this module does not reproduce), and the
 * brackets below are the widely published 2022-reform monthly schedule, not
 * verified against the current Loi de Finances. Treat `irgEstimate` as a
 * planning figure, never a payslip — the UI says so everywhere it appears.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const CONTRACT_TYPES = ['CDI', 'CDD'] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  CDI: 'CDI — durée indéterminée',
  CDD: 'CDD — durée déterminée',
};

export const MARITAL_STATUSES = ['CELIBATAIRE', 'MARIE', 'DIVORCE', 'VEUF'] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  CELIBATAIRE: 'Célibataire',
  MARIE: 'Marié(e)',
  DIVORCE: 'Divorcé(e)',
  VEUF: 'Veuf/Veuve',
};

export const ABSENCE_TYPES = ['CONGE', 'MALADIE', 'INJUSTIFIEE'] as const;
export type AbsenceType = (typeof ABSENCE_TYPES)[number];

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  CONGE: 'Congé',
  MALADIE: 'Maladie',
  INJUSTIFIEE: 'Absence injustifiée',
};

export const TIME_ENTRY_SOURCES = ['manual', 'device'] as const;
export type TimeEntrySource = (typeof TIME_ENTRY_SOURCES)[number];

/** A simple daily approximation — see PROJECT_CONTEXT.md. Not a full attendance model. */
export const EXPECTED_HOURS_PER_DAY = 8;

// ---------------------------------------------------------------------------
// Tenure (ancienneté)
// ---------------------------------------------------------------------------

export interface Tenure {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

/**
 * Time served as of `today`, broken into years/months/days the way a factory
 * actually says it ("3 ans et 2 mois"), plus the raw day count for sorting
 * and for the seniority-bonus thresholds some collective agreements use.
 */
export function tenureOf(hireDate: Date, today: Date): Tenure {
  const totalDays = Math.max(0, Math.round((toUtcMidnight(today) - toUtcMidnight(hireDate)) / 86_400_000));

  let years = today.getUTCFullYear() - hireDate.getUTCFullYear();
  let months = today.getUTCMonth() - hireDate.getUTCMonth();
  let days = today.getUTCDate() - hireDate.getUTCDate();

  if (days < 0) {
    months -= 1;
    days += daysInMonth(today.getUTCFullYear(), today.getUTCMonth());
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (totalDays === 0) {
    years = 0;
    months = 0;
    days = 0;
  }

  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days), totalDays };
}

function toUtcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

// ---------------------------------------------------------------------------
// Payroll deductions — CNAS and an IRG estimate
// ---------------------------------------------------------------------------

/**
 * The employee's CNAS contribution: 9 % of the gross salary. This is the
 * stable, well-published rate (Article of the social-security code) and does
 * not carry the same uncertainty as the IRG brackets below.
 */
export const CNAS_EMPLOYEE_RATE = 0.09;

export function cnasEmployeeContribution(grossSalary: number): number {
  return roundMoney(Math.max(0, grossSalary) * CNAS_EMPLOYEE_RATE);
}

/**
 * The monthly IRG schedule, as commonly published following the 2022
 * reform: exonerated to 30 000 DA, then progressive marginal rates. Applied
 * here as straight bracket taxation (each slice taxed at its own rate, then
 * summed) with NO threshold-smoothing décote — the real law softens the
 * entry into the 23 % bracket so the estimate below runs slightly high for
 * salaries just past 30 000 DA. This is a planning number, not a payslip.
 */
export const IRG_BRACKETS: ReadonlyArray<{ upTo: number | null; rate: number }> = [
  { upTo: 30_000, rate: 0 },
  { upTo: 40_000, rate: 0.23 },
  { upTo: 80_000, rate: 0.27 },
  { upTo: 160_000, rate: 0.3 },
  { upTo: 320_000, rate: 0.33 },
  { upTo: null, rate: 0.35 },
];

/**
 * A planning estimate of monthly IRG on `taxableSalary` (conventionally the
 * gross salary after the CNAS deduction). See the module and `IRG_BRACKETS`
 * comments for what this does and does not reproduce.
 */
export function irgEstimate(taxableSalary: number): number {
  let remaining = Math.max(0, taxableSalary);
  let previousCap = 0;
  let tax = 0;

  for (const bracket of IRG_BRACKETS) {
    const cap = bracket.upTo ?? Infinity;
    const sliceWidth = cap - previousCap;
    const taxedInSlice = Math.min(remaining, sliceWidth);
    if (taxedInSlice > 0) tax += taxedInSlice * bracket.rate;
    remaining -= taxedInSlice;
    previousCap = cap;
    if (remaining <= 0) break;
  }

  return roundMoney(tax);
}

export interface PayEstimate {
  gross: number;
  cnas: number;
  taxableSalary: number;
  irg: number;
  net: number;
}

/** The full chain, gross to net, in one call — what the employee card shows. */
export function payEstimateOf(grossSalary: number): PayEstimate {
  const gross = Math.max(0, grossSalary);
  const cnas = cnasEmployeeContribution(gross);
  const taxableSalary = roundMoney(gross - cnas);
  const irg = irgEstimate(taxableSalary);
  return { gross, cnas, taxableSalary, irg, net: roundMoney(taxableSalary - irg) };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Attendance aggregation
// ---------------------------------------------------------------------------

export interface TimeEntryLike {
  employeeId: string;
  date: Date;
  hoursWorked: number;
}

export interface AbsenceLike {
  employeeId: string;
  type: string;
  startDate: Date;
  endDate: Date;
}

/** Hours logged by one employee within [start, end) — a half-open range. */
export function hoursWorkedInRange(entries: TimeEntryLike[], employeeId: string, start: Date, end: Date): number {
  let total = 0;
  for (const e of entries) {
    if (e.employeeId !== employeeId) continue;
    if (e.date < start || e.date >= end) continue;
    total += e.hoursWorked;
  }
  return roundMoney(total);
}

/**
 * Days of `type` for one employee that overlap [start, end), counted
 * inclusively per absence and clipped to the range. A simple day count, not
 * excluding weekends — see PROJECT_CONTEXT.md.
 */
export function absenceDaysInRange(absences: AbsenceLike[], employeeId: string, type: string, start: Date, end: Date): number {
  let total = 0;
  const rangeEndInclusive = new Date(end.getTime() - 1);
  for (const a of absences) {
    if (a.employeeId !== employeeId || a.type !== type) continue;
    const overlapStart = a.startDate < start ? start : a.startDate;
    const overlapEnd = a.endDate > rangeEndInclusive ? rangeEndInclusive : a.endDate;
    if (overlapStart > overlapEnd) continue;
    total += Math.round((toUtcMidnight(overlapEnd) - toUtcMidnight(overlapStart)) / 86_400_000) + 1;
  }
  return total;
}

export function daysInMonthOf(year: number, monthIndex: number): number {
  return daysInMonth(year, monthIndex);
}

// ---------------------------------------------------------------------------
// Overtime aggregation
// ---------------------------------------------------------------------------

export interface OvertimeEntryLike {
  employeeId: string;
  startDate: Date;
  endDate: Date;
  hours: number;
}

/**
 * Sum of `hours` for one employee's overtime entries whose [startDate,
 * endDate] touches [start, end) — the same overlap test as
 * `absenceDaysInRange`, but summing the declared hours rather than counting
 * days, since one entry already states its total (no per-day proration).
 */
export function overtimeHoursInRange(entries: OvertimeEntryLike[], employeeId: string, start: Date, end: Date): number {
  let total = 0;
  const rangeEndInclusive = new Date(end.getTime() - 1);
  for (const e of entries) {
    if (e.employeeId !== employeeId) continue;
    if (e.endDate < start || e.startDate > rangeEndInclusive) continue;
    total += e.hours;
  }
  return roundMoney(total);
}
