import { describe, expect, it } from 'vitest';
import {
  absenceDaysInRange,
  cnasEmployeeContribution,
  hoursWorkedInRange,
  irgEstimate,
  overtimeHoursInRange,
  payEstimateOf,
  tenureOf,
} from './payroll-math.js';

describe('tenureOf', () => {
  it('reports zero for someone hired today', () => {
    const today = new Date('2026-08-31T00:00:00Z');
    expect(tenureOf(today, today)).toEqual({ years: 0, months: 0, days: 0, totalDays: 0 });
  });

  it('breaks a span into years, months and days', () => {
    const hire = new Date('2023-05-15T00:00:00Z');
    const today = new Date('2026-08-31T00:00:00Z');
    const tenure = tenureOf(hire, today);
    expect(tenure.years).toBe(3);
    expect(tenure.months).toBe(3);
    expect(tenure.days).toBe(16);
    expect(tenure.totalDays).toBe(1204);
  });

  it('borrows a month when the day-of-month has not come round yet', () => {
    // Hired the 20th, today is the 10th — the current month hasn't completed.
    const hire = new Date('2025-01-20T00:00:00Z');
    const today = new Date('2026-02-10T00:00:00Z');
    const tenure = tenureOf(hire, today);
    // Borrowing a day pulls from the current month (February 2026, 28 days).
    expect(tenure.years).toBe(1);
    expect(tenure.months).toBe(0);
    expect(tenure.days).toBe(18);
  });
});

describe('cnasEmployeeContribution', () => {
  it('is 9 % of the gross salary', () => {
    expect(cnasEmployeeContribution(50_000)).toBe(4500);
  });

  it('never goes negative', () => {
    expect(cnasEmployeeContribution(-1000)).toBe(0);
  });
});

describe('irgEstimate', () => {
  it('exonerates salaries at or under 30 000', () => {
    expect(irgEstimate(30_000)).toBe(0);
    expect(irgEstimate(15_000)).toBe(0);
  });

  it('taxes only the slice past 30 000 at 23 % in the second bracket', () => {
    expect(irgEstimate(35_000)).toBe(1150); // 5 000 × 23 %
    expect(irgEstimate(40_000)).toBe(2300); // 10 000 × 23 %
  });

  it('accumulates across brackets', () => {
    // 30k free + 10k*0.23 + 40k*0.27 = 0 + 2300 + 10800 = 13100
    expect(irgEstimate(80_000)).toBe(13_100);
  });

  it('applies the top rate past 320 000', () => {
    const estimate = irgEstimate(400_000);
    // 2300 + 10800 + 24000 + 52800 = 89900, plus 80000*0.35 on the excess over 320000
    expect(estimate).toBe(89_900 + 80_000 * 0.35);
  });

  it('never goes negative on a zero or negative salary', () => {
    expect(irgEstimate(0)).toBe(0);
    expect(irgEstimate(-500)).toBe(0);
  });
});

describe('payEstimateOf', () => {
  it('chains gross to net through CNAS and IRG', () => {
    const estimate = payEstimateOf(50_000);
    expect(estimate.cnas).toBe(4500);
    expect(estimate.taxableSalary).toBe(45_500);
    // 30k free + 10k*0.23 (second bracket, capped at 40k) + 5500*0.27 (third bracket) = 2300 + 1485
    expect(estimate.irg).toBe(3785);
    expect(estimate.net).toBe(45_500 - 3785);
  });
});

describe('hoursWorkedInRange', () => {
  const entries = [
    { employeeId: 'e1', date: new Date('2026-08-05'), hoursWorked: 8 },
    { employeeId: 'e1', date: new Date('2026-08-20'), hoursWorked: 6 },
    { employeeId: 'e1', date: new Date('2026-09-01'), hoursWorked: 8 },
    { employeeId: 'e2', date: new Date('2026-08-05'), hoursWorked: 8 },
  ];

  it('sums one employee within a half-open range', () => {
    expect(hoursWorkedInRange(entries, 'e1', new Date('2026-08-01'), new Date('2026-09-01'))).toBe(14);
  });

  it('excludes the range end (half-open)', () => {
    expect(hoursWorkedInRange(entries, 'e1', new Date('2026-08-01'), new Date('2026-08-20'))).toBe(8);
  });
});

describe('absenceDaysInRange', () => {
  const absences = [
    { employeeId: 'e1', type: 'CONGE', startDate: new Date('2026-08-10'), endDate: new Date('2026-08-14') },
    { employeeId: 'e1', type: 'MALADIE', startDate: new Date('2026-07-28'), endDate: new Date('2026-08-02') },
  ];
  const monthStart = new Date('2026-08-01');
  const monthEnd = new Date('2026-09-01');

  it('counts an absence fully inside the range inclusively', () => {
    expect(absenceDaysInRange(absences, 'e1', 'CONGE', monthStart, monthEnd)).toBe(5);
  });

  it('clips an absence that starts before the range', () => {
    // Straddles July 28 -> Aug 2: only Aug 1-2 count inside August.
    expect(absenceDaysInRange(absences, 'e1', 'MALADIE', monthStart, monthEnd)).toBe(2);
  });

  it('is zero for a type with no matching absence', () => {
    expect(absenceDaysInRange(absences, 'e1', 'INJUSTIFIEE', monthStart, monthEnd)).toBe(0);
  });
});

describe('overtimeHoursInRange', () => {
  const monthStart = new Date('2026-08-01');
  const monthEnd = new Date('2026-09-01');
  const entries = [
    { employeeId: 'e1', startDate: new Date('2026-08-10'), endDate: new Date('2026-08-12'), hours: 6 },
    { employeeId: 'e1', startDate: new Date('2026-07-28'), endDate: new Date('2026-08-02'), hours: 4 },
    { employeeId: 'e1', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-03'), hours: 5 },
    { employeeId: 'e2', startDate: new Date('2026-08-10'), endDate: new Date('2026-08-10'), hours: 3 },
  ];

  it('sums entries whose range overlaps the month', () => {
    expect(overtimeHoursInRange(entries, 'e1', monthStart, monthEnd)).toBe(10);
  });

  it('excludes entries entirely outside the range', () => {
    expect(overtimeHoursInRange(entries, 'e1', new Date('2026-06-01'), new Date('2026-07-01'))).toBe(0);
  });

  it('is scoped to one employee', () => {
    expect(overtimeHoursInRange(entries, 'e2', monthStart, monthEnd)).toBe(3);
  });
});
