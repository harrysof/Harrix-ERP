import { describe, expect, it } from 'vitest';
import {
  deltaRate,
  inMonth,
  isMonthKey,
  monthKeyOf,
  monthLabel,
  monthRange,
  monthResult,
  monthShortLabel,
  monthsEndingAt,
  sumBy,
  topBy,
} from './analytics-math.js';

describe('month keys', () => {
  it('accepts a well-formed month and rejects everything else', () => {
    expect(isMonthKey('2026-09')).toBe(true);
    expect(isMonthKey('2026-1')).toBe(false);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-00')).toBe(false);
    expect(isMonthKey('septembre')).toBe(false);
  });

  it('produces a half-open UTC range, so the 1st at midnight belongs to one month only', () => {
    const { start, end } = monthRange('2026-09');
    expect(start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(inMonth(new Date('2026-09-01T00:00:00.000Z'), '2026-09')).toBe(true);
    expect(inMonth(new Date('2026-10-01T00:00:00.000Z'), '2026-09')).toBe(false);
  });

  it('wraps a year backwards when stepping over January', () => {
    expect(monthsEndingAt('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('names months in French, long and short', () => {
    expect(monthLabel('2026-09')).toBe('septembre 2026');
    expect(monthShortLabel('2026-09')).toBe('sep 26');
  });

  it('reads the month off a date', () => {
    expect(monthKeyOf(new Date('2026-12-31T23:00:00.000Z'))).toBe('2026-12');
  });
});

describe('topBy', () => {
  const rows = [
    { name: 'Cuir', value: 40 },
    { name: 'Semelle', value: 90 },
    { name: 'Colle', value: 0 },
    { name: 'Fil', value: 40 },
  ];

  it('ranks descending, drops empty rows and truncates', () => {
    expect(topBy(rows, (r) => r.value, 2).map((r) => r.name)).toEqual(['Semelle', 'Cuir']);
  });

  it('breaks ties by the tiebreak rather than by fetch order', () => {
    const ranked = topBy(rows, (r) => r.value, 5, (r) => r.name).map((r) => r.name);
    expect(ranked).toEqual(['Semelle', 'Cuir', 'Fil']);
  });

  it('leaves the input untouched', () => {
    topBy(rows, (r) => r.value, 2);
    expect(rows[0].name).toBe('Cuir');
  });
});

describe('sumBy', () => {
  it('buckets by key, keeping the first row’s metadata', () => {
    const lines = [
      { itemId: 'a', name: 'Cuir', qty: 3 },
      { itemId: 'b', name: 'Fil', qty: 5 },
      { itemId: 'a', name: 'Cuir', qty: 1.5 },
    ];
    const out = sumBy(lines, (l) => l.itemId, (l) => l.qty, (l) => ({ name: l.name }));
    expect(out).toEqual([
      { id: 'a', name: 'Cuir', value: 4.5 },
      { id: 'b', name: 'Fil', value: 5 },
    ]);
  });

  it('skips rows with no key rather than inventing an empty bucket', () => {
    const out = sumBy([{ id: null, v: 9 }], (r) => r.id, (r) => r.v, () => ({}));
    expect(out).toEqual([]);
  });
});

describe('monthResult', () => {
  it('adds the three cost buckets and subtracts them from revenue', () => {
    const result = monthResult({ revenue: 1000, materialCost: 300, payrollCost: 200, factoryCost: 100 });
    expect(result.totalCost).toBe(600);
    expect(result.profit).toBe(400);
    expect(result.marginRate).toBeCloseTo(0.4);
  });

  it('reports a loss rather than clamping at zero', () => {
    const result = monthResult({ revenue: 100, materialCost: 300, payrollCost: 0, factoryCost: 0 });
    expect(result.profit).toBe(-200);
    expect(result.marginRate).toBeCloseTo(-2);
  });

  it('has no margin to report when nothing was sold', () => {
    expect(monthResult({ revenue: 0, materialCost: 50, payrollCost: 0, factoryCost: 0 }).marginRate).toBeNull();
  });
});

describe('deltaRate', () => {
  it('measures change against the previous figure', () => {
    expect(deltaRate(150, 100)).toBeCloseTo(0.5);
    expect(deltaRate(50, 100)).toBeCloseTo(-0.5);
  });

  it('returns null with no previous figure — "new" is not "+100 %"', () => {
    expect(deltaRate(150, 0)).toBeNull();
  });

  it('uses the magnitude of the previous figure, so a recovery from a loss reads positive', () => {
    expect(deltaRate(50, -100)).toBeCloseTo(1.5);
  });
});
