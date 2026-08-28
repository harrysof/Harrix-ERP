import { describe, expect, it } from 'vitest';
import {
  getAccountedOutput,
  getRates,
  getUnknownUnits,
  getVariance,
  groupLosses,
  statusAfterOutput,
  summarizeLosses,
  type OutputFigures,
} from './production-math.js';

function batch(partial: Partial<OutputFigures> = {}): OutputFigures {
  return { expectedQuantity: 0, firstChoice: 0, secondChoice: 0, waste: 0, outputDeclared: true, ...partial };
}

/** The example from the project brief, kept literally so it can't silently change. */
const FACTORY_EXAMPLE = batch({ expectedQuantity: 120, firstChoice: 95, secondChoice: 8, waste: 7 });

describe('getUnknownUnits', () => {
  it('computes the brief example: 120 - 95 - 8 - 7 = 10', () => {
    expect(getAccountedOutput(FACTORY_EXAMPLE)).toBe(110);
    expect(getUnknownUnits(FACTORY_EXAMPLE)).toBe(10);
  });

  it('returns null while output has not been declared', () => {
    expect(getUnknownUnits(batch({ expectedQuantity: 120, outputDeclared: false }))).toBeNull();
  });

  it('reports a negative gap when more was counted than the machine announced', () => {
    expect(getUnknownUnits(batch({ expectedQuantity: 100, firstChoice: 105 }))).toBe(-5);
  });

  it('does not accumulate float noise', () => {
    expect(getUnknownUnits(batch({ expectedQuantity: 10, firstChoice: 0.1, secondChoice: 0.2 }))).toBe(9.7);
  });
});

describe('getVariance', () => {
  it('flags a gap for investigation until it has been explained', () => {
    expect(getVariance(FACTORY_EXAMPLE).needsInvestigation).toBe(true);
    expect(getVariance(FACTORY_EXAMPLE, true).needsInvestigation).toBe(false);
  });

  it('flags a negative gap too', () => {
    expect(getVariance(batch({ expectedQuantity: 100, firstChoice: 105 })).needsInvestigation).toBe(true);
  });

  it('does not flag a fully accounted batch', () => {
    expect(getVariance(batch({ expectedQuantity: 100, firstChoice: 90, secondChoice: 5, waste: 5 })).needsInvestigation).toBe(false);
  });

  it('does not flag an undeclared batch', () => {
    expect(getVariance(batch({ expectedQuantity: 120, outputDeclared: false })).needsInvestigation).toBe(false);
  });
});

describe('getRates', () => {
  it('expresses every rate as a share of expected output', () => {
    const rates = getRates(FACTORY_EXAMPLE);
    expect(rates.yieldRate).toBeCloseTo(95 / 120, 4);
    expect(rates.secondChoiceRate).toBeCloseTo(8 / 120, 4);
    expect(rates.wasteRate).toBeCloseTo(7 / 120, 4);
    expect(rates.unknownRate).toBeCloseTo(10 / 120, 4);
  });

  it('returns nulls rather than dividing by zero', () => {
    expect(getRates(batch({ expectedQuantity: 0, firstChoice: 5 }))).toEqual({
      yieldRate: null,
      secondChoiceRate: null,
      wasteRate: null,
      unknownRate: null,
    });
  });
});

describe('statusAfterOutput', () => {
  it('completes a fully accounted batch and investigates a gap', () => {
    expect(statusAfterOutput(batch({ expectedQuantity: 100, firstChoice: 100 }))).toBe('COMPLETED');
    expect(statusAfterOutput(FACTORY_EXAMPLE)).toBe('INVESTIGATION');
  });
});

describe('summarizeLosses', () => {
  it('ignores batches whose output has not been declared', () => {
    const totals = summarizeLosses([FACTORY_EXAMPLE, batch({ expectedQuantity: 500, outputDeclared: false })]);
    expect(totals.batchCount).toBe(1);
    expect(totals.expected).toBe(120);
    expect(totals.unknown).toBe(10);
  });

  it('adds batches up before computing rates, not the other way round', () => {
    const totals = summarizeLosses([
      batch({ expectedQuantity: 100, firstChoice: 100 }),
      batch({ expectedQuantity: 100, firstChoice: 50, waste: 30 }),
    ]);
    expect(totals.expected).toBe(200);
    expect(totals.waste).toBe(30);
    expect(totals.unknown).toBe(20);
    expect(totals.rates.wasteRate).toBeCloseTo(0.15, 4);
    expect(totals.rates.yieldRate).toBeCloseTo(0.75, 4);
  });

  it('returns null rates for an empty set instead of NaN', () => {
    expect(summarizeLosses([]).rates.yieldRate).toBeNull();
  });
});

describe('groupLosses', () => {
  it('groups by the given key and sorts the worst offender first', () => {
    type Row = OutputFigures & { machine: string };
    const rows: Row[] = [
      { ...batch({ expectedQuantity: 100, firstChoice: 99, waste: 1 }), machine: 'Ligne 1' },
      { ...batch({ expectedQuantity: 100, firstChoice: 60, waste: 25 }), machine: 'Ligne 2' },
      { ...batch({ expectedQuantity: 100, firstChoice: 100 }), machine: 'Ligne 2' },
    ];
    const grouped = groupLosses(rows, (r) => r.machine, (r) => r.machine);

    expect(grouped.map((g) => g.key)).toEqual(['Ligne 2', 'Ligne 1']);
    expect(grouped[0].batchCount).toBe(2);
    expect(grouped[0].waste).toBe(25);
    expect(grouped[0].unknown).toBe(15);
  });
});
