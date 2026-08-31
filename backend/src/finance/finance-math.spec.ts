import { describe, expect, it } from 'vitest';
import {
  buildPricing,
  buildRegister,
  marginOnPriceOf,
  markupOf,
  monthKeyOf,
  monthLabel,
  monthPeriod,
  monthsInRange,
  periodOfMonths,
  summariseProduction,
  suggestedPriceOf,
  type CostCategoryLike,
  type CostEntryLike,
} from './finance-math.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MATERIALS: CostCategoryLike = {
  id: 'cat-mat',
  key: 'matieres-premieres',
  label: 'Matières premières',
  nature: 'DIRECT',
  behavior: 'VARIABLE',
  isMaterials: true,
  sortOrder: 0,
};

const RENT: CostCategoryLike = {
  id: 'cat-rent',
  key: 'loyer',
  label: 'Loyer',
  nature: 'INDIRECT',
  behavior: 'FIXED',
  isMaterials: false,
  sortOrder: 1,
};

const POWER: CostCategoryLike = {
  id: 'cat-power',
  key: 'energie',
  label: 'Énergie',
  nature: 'INDIRECT',
  behavior: 'VARIABLE',
  isMaterials: false,
  sortOrder: 2,
};

const DIRECT_LABOUR: CostCategoryLike = {
  id: 'cat-labour',
  key: 'main-doeuvre-directe',
  label: "Main-d'œuvre directe",
  nature: 'DIRECT',
  behavior: 'VARIABLE',
  isMaterials: false,
  sortOrder: 3,
};

const CATEGORIES = [MATERIALS, RENT, POWER, DIRECT_LABOUR];

function entry(categoryId: string, amount: number, productItemId: string | null = null): CostEntryLike {
  return { id: `e-${categoryId}-${amount}-${productItemId ?? 'pool'}`, categoryId, amount, productItemId };
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

describe('periods', () => {
  it('turns a month key into a half-open UTC range', () => {
    const { start, end } = monthPeriod('2026-08');
    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('rolls the year over in December', () => {
    expect(monthPeriod('2026-12').end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('refuses a month that is not AAAA-MM', () => {
    expect(() => monthPeriod('2026-13')).toThrow(/Mois invalide/);
    expect(() => monthPeriod('aout')).toThrow(/Mois invalide/);
  });

  it('names the month a date falls in', () => {
    expect(monthKeyOf(new Date('2026-08-31T23:30:00.000Z'))).toBe('2026-08');
  });

  it('lists months inclusively and covers them with one range', () => {
    expect(monthsInRange('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(monthsInRange('2026-05', '2026-04')).toEqual([]);

    const period = periodOfMonths(['2026-12', '2026-10', '2026-11']);
    expect(period.start.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(period.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('labels a month in French', () => {
    expect(monthLabel('2026-08')).toBe('août 2026');
  });
});

// ---------------------------------------------------------------------------
// Production summary
// ---------------------------------------------------------------------------

describe('summariseProduction', () => {
  it('adds up sellable units and material cost per product', () => {
    const summary = summariseProduction([
      { productItemId: 'p1', sellableQuantity: 500, materialCost: 620_000, uncostedLineCount: 0 },
      { productItemId: 'p1', sellableQuantity: 250, materialCost: 310_000, uncostedLineCount: 1 },
      { productItemId: 'p2', sellableQuantity: 500, materialCost: 400_000, uncostedLineCount: 0 },
    ]);

    expect(summary.totalUnits).toBe(1250);
    expect(summary.totalMaterialCost).toBe(1_330_000);
    expect(summary.uncostedLineCount).toBe(1);

    const p1 = summary.byProduct.get('p1');
    expect(p1?.unitsProduced).toBe(750);
    expect(p1?.materialCost).toBe(930_000);
    expect(p1?.batchCount).toBe(2);
  });

  it('is empty, not broken, with no batches', () => {
    const summary = summariseProduction([]);
    expect(summary.totalUnits).toBe(0);
    expect(summary.byProduct.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The register
// ---------------------------------------------------------------------------

describe('buildRegister', () => {
  it('totals typed entries per category and splits the four subtotals', () => {
    const register = buildRegister({
      categories: CATEGORIES,
      entries: [entry(RENT.id, 120_000), entry(POWER.id, 45_000), entry(POWER.id, 5_000), entry(DIRECT_LABOUR.id, 300_000)],
      materialCost: 1_330_000,
    });

    const byKey = Object.fromEntries(register.lines.map((l) => [l.key, l]));
    expect(byKey.loyer.amount).toBe(120_000);
    expect(byKey.energie.amount).toBe(50_000);
    expect(byKey.energie.entryCount).toBe(2);

    // Materials is direct + variable, so it lands in both of those subtotals.
    expect(register.totals.direct).toBe(1_630_000);
    expect(register.totals.indirect).toBe(170_000);
    expect(register.totals.fixed).toBe(120_000);
    expect(register.totals.variable).toBe(1_680_000);
    expect(register.totals.total).toBe(1_800_000);
  });

  it('keeps a category with no entries as a zero line', () => {
    const register = buildRegister({ categories: CATEGORIES, entries: [], materialCost: 0 });
    expect(register.lines).toHaveLength(4);
    expect(register.lines.every((l) => l.amount === 0)).toBe(true);
  });

  it('computes the materials line from production rather than from entries', () => {
    const register = buildRegister({
      categories: CATEGORIES,
      // An entry pointing at the materials category must not be counted.
      entries: [entry(MATERIALS.id, 999_999)],
      materialCost: 1_330_000,
    });

    const materials = register.lines.find((l) => l.key === 'matieres-premieres');
    expect(materials?.derived).toBe(true);
    expect(materials?.amount).toBe(1_330_000);
    expect(materials?.entryCount).toBe(0);
  });

  it('shows a correction beside the computed figure, never instead of it', () => {
    const register = buildRegister({
      categories: CATEGORIES,
      entries: [],
      materialCost: 1_330_000,
      override: { amount: 1_300_000, reason: 'Inventaire physique de fin de mois' },
    });

    const materials = register.lines.find((l) => l.key === 'matieres-premieres');
    expect(materials?.amount).toBe(1_300_000);
    expect(materials?.computedAmount).toBe(1_330_000);
    expect(materials?.override?.reason).toBe('Inventaire physique de fin de mois');
    expect(register.warnings.map((w) => w.code)).toContain('MATERIALS_OVERRIDDEN');
  });

  it('flags consumed material with no known cost', () => {
    const register = buildRegister({ categories: CATEGORIES, entries: [], materialCost: 100, uncostedLineCount: 3 });
    expect(register.warnings.map((w) => w.code)).toContain('UNCOSTED_MATERIALS');
  });
});

// ---------------------------------------------------------------------------
// Absorption and pricing
// ---------------------------------------------------------------------------

describe('buildPricing', () => {
  const production = summariseProduction([
    { productItemId: 'p1', sellableQuantity: 750, materialCost: 930_000, uncostedLineCount: 0 },
    { productItemId: 'p2', sellableQuantity: 500, materialCost: 400_000, uncostedLineCount: 0 },
  ]);

  const products = [
    { id: 'p1', price: 2400, targetMargin: null },
    { id: 'p2', price: null, targetMargin: null },
  ];

  it('shares the pool per unit produced and shows the division it used', () => {
    const result = buildPricing({
      production,
      categories: CATEGORIES,
      entries: [entry(RENT.id, 120_000), entry(POWER.id, 30_000)],
      products,
      basis: 'UNITS',
      defaultMargin: 0.25,
    });

    // 150 000 DZD over 1 250 pairs = 120 DZD each.
    expect(result.allocation.pool).toBe(150_000);
    expect(result.allocation.divisor).toBe(1250);
    expect(result.allocation.ratePerUnitOfBasis).toBe(120);

    const p1 = result.products.find((p) => p.productItemId === 'p1')!;
    expect(p1.indirectShare).toBe(90_000);
    expect(p1.indirectUnitCost).toBe(120);
    expect(p1.materialUnitCost).toBe(1240);
    expect(p1.unitCost).toBe(1360);
    expect(p1.suggestedPrice).toBe(1700);
  });

  it('shares the pool in proportion to material cost when asked to', () => {
    const result = buildPricing({
      production,
      categories: CATEGORIES,
      entries: [entry(RENT.id, 133_000)],
      products,
      basis: 'MATERIAL_COST',
      defaultMargin: 0.25,
    });

    expect(result.allocation.divisor).toBe(1_330_000);
    // p1 consumed 930 000 of 1 330 000 -> 93 000 of the 133 000.
    const p1 = result.products.find((p) => p.productItemId === 'p1')!;
    expect(p1.indirectShare).toBe(93_000);
    const p2 = result.products.find((p) => p.productItemId === 'p2')!;
    expect(p2.indirectShare).toBe(40_000);
  });

  it('attributes a direct cost to its product and keeps it out of the pool', () => {
    const result = buildPricing({
      production,
      categories: CATEGORIES,
      entries: [entry(DIRECT_LABOUR.id, 75_000, 'p1'), entry(RENT.id, 125_000)],
      products,
      basis: 'UNITS',
      defaultMargin: 0.25,
    });

    expect(result.allocation.pool).toBe(125_000);
    const p1 = result.products.find((p) => p.productItemId === 'p1')!;
    expect(p1.directCost).toBe(75_000);
    expect(p1.directUnitCost).toBe(100);
    const p2 = result.products.find((p) => p.productItemId === 'p2')!;
    expect(p2.directCost).toBe(0);
  });

  it('pools an unattributed direct cost and says so', () => {
    const result = buildPricing({
      production,
      categories: CATEGORIES,
      entries: [entry(DIRECT_LABOUR.id, 75_000)],
      products,
      basis: 'UNITS',
      defaultMargin: 0.25,
    });

    expect(result.allocation.pool).toBe(75_000);
    expect(result.warnings.map((w) => w.code)).toContain('UNATTRIBUTED_DIRECT');
  });

  it('never lets a typed entry on the materials category double-count', () => {
    const result = buildPricing({
      production,
      categories: CATEGORIES,
      entries: [entry(MATERIALS.id, 999_999)],
      products,
      basis: 'UNITS',
      defaultMargin: 0.25,
    });
    expect(result.allocation.pool).toBe(0);
  });

  it('scales each product material cost with a period correction', () => {
    const result = buildPricing({
      production,
      categories: CATEGORIES,
      entries: [],
      products,
      basis: 'UNITS',
      defaultMargin: 0.25,
      materialOverride: { amount: 665_000, reason: 'Inventaire' },
    });

    // The month's materials were halved, so every product's share halves too.
    const p1 = result.products.find((p) => p.productItemId === 'p1')!;
    expect(p1.materialCost).toBe(465_000);
    expect(p1.materialUnitCost).toBe(620);
  });

  it('refuses to spread a correction when nothing was consumed', () => {
    const result = buildPricing({
      production: summariseProduction([{ productItemId: 'p1', sellableQuantity: 10, materialCost: 0, uncostedLineCount: 0 }]),
      categories: CATEGORIES,
      entries: [],
      products: [{ id: 'p1', price: 100, targetMargin: null }],
      basis: 'UNITS',
      defaultMargin: 0.25,
      materialOverride: { amount: 50_000, reason: 'Régularisation' },
    });
    expect(result.warnings.map((w) => w.code)).toContain('OVERRIDE_NOT_DISTRIBUTABLE');
  });

  it('reports an unknown cost as null, not as zero', () => {
    const result = buildPricing({
      production,
      categories: CATEGORIES,
      entries: [entry(RENT.id, 120_000)],
      products: [...products, { id: 'p3', price: 900, targetMargin: null }],
      basis: 'UNITS',
      defaultMargin: 0.25,
    });

    const p3 = result.products.find((p) => p.productItemId === 'p3')!;
    expect(p3.unitsProduced).toBe(0);
    expect(p3.unitCost).toBeNull();
    expect(p3.suggestedPrice).toBeNull();
    expect(p3.warnings.map((w) => w.code)).toContain('NO_PRODUCTION');
  });

  it('warns when a period has no production at all', () => {
    const result = buildPricing({
      production: summariseProduction([]),
      categories: CATEGORIES,
      entries: [entry(RENT.id, 120_000)],
      products,
      basis: 'UNITS',
      defaultMargin: 0.25,
    });

    expect(result.allocation.ratePerUnitOfBasis).toBeNull();
    expect(result.warnings.map((w) => w.code)).toContain('NO_PRODUCTION');
    expect(result.products.every((p) => p.unitCost === null)).toBe(true);
  });

  it('warns when the chosen basis is zero but there are charges to spread', () => {
    const result = buildPricing({
      production: summariseProduction([{ productItemId: 'p1', sellableQuantity: 100, materialCost: 0, uncostedLineCount: 0 }]),
      categories: CATEGORIES,
      entries: [entry(RENT.id, 120_000)],
      products: [{ id: 'p1', price: 500, targetMargin: null }],
      basis: 'MATERIAL_COST',
      defaultMargin: 0.25,
    });

    expect(result.warnings.map((w) => w.code)).toContain('NO_ALLOCATION_BASE');
  });

  it("prefers a product's own margin over the factory default", () => {
    const result = buildPricing({
      production,
      categories: CATEGORIES,
      entries: [],
      products: [{ id: 'p1', price: 2400, targetMargin: 0.4 }],
      basis: 'UNITS',
      defaultMargin: 0.25,
    });

    const p1 = result.products[0];
    expect(p1.margin).toBe(0.4);
    expect(p1.marginIsOverride).toBe(true);
    // 1 240 of material, nothing else -> 1 240 × 1,4
    expect(p1.suggestedPrice).toBe(1736);
  });

  it('compares the price actually charged against the computed cost', () => {
    const result = buildPricing({
      production,
      categories: CATEGORIES,
      entries: [],
      products,
      basis: 'UNITS',
      defaultMargin: 0.25,
    });

    const p1 = result.products.find((p) => p.productItemId === 'p1')!;
    expect(p1.unitCost).toBe(1240);
    // 2 400 sold against 1 240 of cost.
    expect(p1.currentMarkup).toBeCloseTo(0.9355, 4);
    expect(p1.currentMarginOnPrice).toBeCloseTo(0.4833, 4);

    const p2 = result.products.find((p) => p.productItemId === 'p2')!;
    expect(p2.currentMarkup).toBeNull();
    expect(p2.warnings.map((w) => w.code)).toContain('NO_PRICE_SET');
  });
});

// ---------------------------------------------------------------------------
// Margin helpers
// ---------------------------------------------------------------------------

describe('margin helpers', () => {
  it('separates markup from margin on price', () => {
    // The classic confusion: +25 % on cost is 20 % of the selling price.
    expect(markupOf(125, 100)).toBe(0.25);
    expect(marginOnPriceOf(125, 100)).toBe(0.2);
  });

  it('returns null rather than infinity on a zero base', () => {
    expect(markupOf(125, 0)).toBeNull();
    expect(marginOnPriceOf(0, 100)).toBeNull();
    expect(markupOf(null, 100)).toBeNull();
  });

  it('applies a markup to a cost', () => {
    expect(suggestedPriceOf(1360, 0.25)).toBe(1700);
    expect(suggestedPriceOf(null, 0.25)).toBeNull();
  });
});
