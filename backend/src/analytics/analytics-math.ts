/**
 * Pure dashboard arithmetic — no Nest, no Prisma, no Date.now(), like
 * stock-math.ts, sales-math.ts and payroll-math.ts. Unit tested in
 * analytics-math.spec.ts.
 *
 * Everything the tableau de bord shows is derived here from rows the service
 * fetched, never stored: a KPI that is written down is a KPI that drifts the
 * moment an order, a movement or a salary changes. The one thing this file
 * owns that the others don't is the *month* — the dashboard is a month-by-
 * month view, so "which rows belong to 2026-09" is a decision made once,
 * here, rather than re-derived (slightly differently) in eight places.
 */

import { t, type MessageKey } from '../i18n/messages/index.js';
import { currentLang } from '../i18n/context.js';

/** A calendar month, as the UI and the API both spell it: "2026-09". */
export type MonthKey = string;

export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

/**
 * The half-open UTC range [start, end) covering a month. Half-open on
 * purpose: `date < end` needs no "…and not the 1st at midnight" special case,
 * and it is the same shape finance.service.ts already uses for its costs.
 */
export function monthRange(month: MonthKey): { start: Date; end: Date } {
  const [year, m] = month.split('-').map(Number);
  return { start: new Date(Date.UTC(year, m - 1, 1)), end: new Date(Date.UTC(year, m, 1)) };
}

/** The month a date falls in. */
export function monthKeyOf(date: Date): MonthKey {
  return date.toISOString().slice(0, 7);
}

/** `count` months ending at (and including) `month`, oldest first. */
export function monthsEndingAt(month: MonthKey, count: number): MonthKey[] {
  const [year, m] = month.split('-').map(Number);
  const out: MonthKey[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, m - 1 - i, 1));
    out.push(monthKeyOf(d));
  }
  return out;
}

const MONTH_KEYS = [
  'common.month.1',
  'common.month.2',
  'common.month.3',
  'common.month.4',
  'common.month.5',
  'common.month.6',
  'common.month.7',
  'common.month.8',
  'common.month.9',
  'common.month.10',
  'common.month.11',
  'common.month.12',
] as const satisfies readonly MessageKey[];

/** Month label for the picker and the chart axis: "septembre 2026". */
export function monthLabel(month: MonthKey): string {
  const [year, m] = month.split('-').map(Number);
  return `${t(MONTH_KEYS[m - 1])} ${year}`;
}

/** Short label for a chart axis, where twelve of them share one line. */
export function monthShortLabel(month: MonthKey): string {
  const [year, m] = month.split('-').map(Number);
  const name = t(MONTH_KEYS[m - 1]);
  const short = currentLang() === 'fr' ? name.slice(0, 3) : name;
  return `${short} ${String(year).slice(2)}`;
}

export function inMonth(date: Date, month: MonthKey): boolean {
  const { start, end } = monthRange(month);
  return date >= start && date < end;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

/**
 * The dashboard is almost entirely "top N of something". One helper, so every
 * leaderboard sorts and truncates identically — and so a tie never depends on
 * which order Prisma happened to return the rows in.
 */
export function topBy<T>(rows: T[], value: (row: T) => number, limit = 5, tiebreak?: (row: T) => string): T[] {
  return [...rows]
    .filter((r) => value(r) > 0)
    .sort((a, b) => {
      const diff = value(b) - value(a);
      if (diff !== 0) return diff;
      if (!tiebreak) return 0;
      return tiebreak(a).localeCompare(tiebreak(b), 'fr');
    })
    .slice(0, limit);
}

/**
 * Sum rows into buckets keyed by id, keeping one label per bucket. Used for
 * every "par article / par employé / par libellé" roll-up on the dashboard.
 */
export function sumBy<T, M>(
  rows: T[],
  key: (row: T) => string | null | undefined,
  amount: (row: T) => number,
  meta: (row: T) => M,
): Array<M & { id: string; value: number }> {
  const buckets = new Map<string, M & { id: string; value: number }>();
  for (const row of rows) {
    const id = key(row);
    if (!id) continue;
    const existing = buckets.get(id);
    if (existing) existing.value = round(existing.value + amount(row));
    else buckets.set(id, { ...meta(row), id, value: round(amount(row)) });
  }
  return [...buckets.values()];
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/**
 * The month's bottom line. Deliberately three named cost buckets rather than
 * one opaque "charges", because the factory can act on each differently and
 * because only one of them (materials) is an estimate.
 *
 * `purchases` — what left the bank to buy stock this month — is NOT part of
 * this: buying a year of leather in January is not a January loss, it is
 * stock. It is reported next to the result as a cash figure, and the UI says
 * which is which.
 */
export interface MonthResult {
  revenue: number;
  materialCost: number;
  payrollCost: number;
  factoryCost: number;
  totalCost: number;
  profit: number;
  /** profit ÷ revenue, as a fraction. Null when there was no revenue to divide by. */
  marginRate: number | null;
}

export function monthResult(input: {
  revenue: number;
  materialCost: number;
  payrollCost: number;
  factoryCost: number;
}): MonthResult {
  const revenue = round(input.revenue);
  const materialCost = round(input.materialCost);
  const payrollCost = round(input.payrollCost);
  const factoryCost = round(input.factoryCost);
  const totalCost = round(materialCost + payrollCost + factoryCost);
  const profit = round(revenue - totalCost);
  return {
    revenue,
    materialCost,
    payrollCost,
    factoryCost,
    totalCost,
    profit,
    marginRate: revenue > 0 ? profit / revenue : null,
  };
}

/**
 * Change against the previous month, as a fraction. Null when there is no
 * meaningful comparison: no previous figure means "new", not "+100 %".
 */
export function deltaRate(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}
