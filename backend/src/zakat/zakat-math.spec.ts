import { describe, expect, it } from 'vitest';
import {
  computeDueDate,
  computeZakatTotals,
  formatHijri,
  gregorianToHijri,
  hijriToGregorian,
  paymentStatusOf,
} from './zakat-math.js';

describe('computeZakatTotals', () => {
  it('sums every bucket and applies the rate above nisab', () => {
    const totals = computeZakatTotals({
      cash: 450_000,
      bank: 2_100_000,
      finishedGoodsValue: 3_500_000,
      rawMaterialsValue: 800_000,
      receivablesValue: 1_600_000,
      otherAssets: 0,
      deductions: 1_200_000,
      goldPricePerGram: 14_000,
      zakatRate: 0.025,
    });
    expect(totals.cashAndBank).toBe(2_550_000);
    expect(totals.totalAssets).toBe(8_450_000);
    expect(totals.nisabValue).toBe(85 * 14_000);
    expect(totals.zakatableBase).toBe(7_250_000);
    expect(totals.belowNisab).toBe(false);
    expect(totals.zakatDue).toBe(181_250);
  });

  it('owes nothing below nisab', () => {
    const totals = computeZakatTotals({
      cash: 10_000,
      bank: 0,
      finishedGoodsValue: 0,
      rawMaterialsValue: 0,
      receivablesValue: 0,
      otherAssets: 0,
      deductions: 0,
      goldPricePerGram: 14_000,
      zakatRate: 0.025,
    });
    expect(totals.belowNisab).toBe(true);
    expect(totals.zakatDue).toBe(0);
  });

  it('floors the base at zero when deductions exceed assets, rather than going negative', () => {
    const totals = computeZakatTotals({
      cash: 100_000,
      bank: 0,
      finishedGoodsValue: 0,
      rawMaterialsValue: 0,
      receivablesValue: 0,
      otherAssets: 0,
      deductions: 500_000,
      goldPricePerGram: 14_000,
      zakatRate: 0.025,
    });
    expect(totals.zakatableBase).toBe(0);
    expect(totals.zakatDue).toBe(0);
  });
});

describe('paymentStatusOf', () => {
  it('is PAID when nothing is due', () => {
    expect(paymentStatusOf(0, 0)).toBe('PAID');
  });

  it('is NOT_PAID when due but nothing paid', () => {
    expect(paymentStatusOf(100_000, 0)).toBe('NOT_PAID');
  });

  it('is PARTIALLY_PAID between zero and the full amount', () => {
    expect(paymentStatusOf(100_000, 40_000)).toBe('PARTIALLY_PAID');
  });

  it('is PAID once the paid amount reaches the due amount', () => {
    expect(paymentStatusOf(100_000, 100_000)).toBe('PAID');
    expect(paymentStatusOf(100_000, 120_000)).toBe('PAID');
  });
});

describe('Hijri calendar (tabular approximation)', () => {
  it('round-trips Gregorian → Hijri → Gregorian for several dates', () => {
    const samples = [new Date('2020-01-01T00:00:00Z'), new Date('2024-07-07T00:00:00Z'), new Date('2026-09-02T00:00:00Z')];
    for (const date of samples) {
      const hijri = gregorianToHijri(date);
      const back = hijriToGregorian(hijri);
      expect(back.toISOString().slice(0, 10)).toBe(date.toISOString().slice(0, 10));
    }
  });

  it('lands in the plausible Hijri year range for a known Gregorian year', () => {
    // AH years run roughly 578-579 behind AD in the relevant range.
    const hijri = gregorianToHijri(new Date('2026-09-02T00:00:00Z'));
    expect(hijri.year).toBeGreaterThanOrEqual(1447);
    expect(hijri.year).toBeLessThanOrEqual(1448);
    expect(hijri.month).toBeGreaterThanOrEqual(1);
    expect(hijri.month).toBeLessThanOrEqual(12);
  });

  it('formats as "day month year"', () => {
    expect(formatHijri({ year: 1448, month: 9, day: 12 })).toBe('12 Ramadan 1448');
  });
});

describe('computeDueDate', () => {
  it('SOLAR adds exactly one Gregorian year', () => {
    const due = computeDueDate(new Date('2026-09-02T00:00:00Z'), 'SOLAR');
    expect(due.toISOString().slice(0, 10)).toBe('2027-09-02');
  });

  it('LUNAR advances by one Hijri year — roughly 354 days, not 365', () => {
    const start = new Date('2026-09-02T00:00:00Z');
    const due = computeDueDate(start, 'LUNAR');
    const diffDays = Math.round((due.getTime() - start.getTime()) / 86_400_000);
    expect(diffDays).toBeGreaterThanOrEqual(353);
    expect(diffDays).toBeLessThanOrEqual(356);
  });
});
