/**
 * Finance — the cost register, cost absorption, and the price it suggests.
 *
 * Pure data and pure functions: no Nest, no Prisma, no Date.now(). Everything
 * here is unit tested against plain objects (finance-math.spec.ts), for the
 * same reason stock-math.ts and production-math.ts are — this is the file
 * that decides what a pair of shoes costs, and that arithmetic has to be
 * checkable without a database.
 *
 * The one idea worth stating up front: a product's cost is part fact and part
 * judgement. The material half is a fact — that lot consumed that leather at
 * that price, traced through ProductionConsumption. The other half — the
 * rent, the electricity, the accountant's own salary — is a monthly lump with
 * no natural per-pair number, and turning it into one means *choosing* how to
 * divide it. So every function here that divides an overhead reports the
 * divisor it used alongside the result: the screen shows
 * "380 000 ÷ 1 250 paires = 304 DZD", never just "304".
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/**
 * Can this cost be traced to a product, or must it be shared out?
 *
 * Kept separate from `behavior` on purpose. "Direct / indirect / fixe /
 * variable" is really two independent questions — a direct cost can be fixed
 * (a leased moulding machine dedicated to one model) and an indirect one can
 * be variable (electricity). Collapsing them into a single list is how cost
 * registers turn into a drawer nobody can total.
 */
export const COST_NATURES = ['DIRECT', 'INDIRECT'] as const;
export type CostNature = (typeof COST_NATURES)[number];

export const COST_NATURE_LABELS: Record<CostNature, string> = {
  DIRECT: 'Coût direct',
  INDIRECT: 'Coût indirect',
};

/** Does this cost move with volume, or is it there whatever we make? */
export const COST_BEHAVIORS = ['FIXED', 'VARIABLE'] as const;
export type CostBehavior = (typeof COST_BEHAVIORS)[number];

export const COST_BEHAVIOR_LABELS: Record<CostBehavior, string> = {
  FIXED: 'Charge fixe',
  VARIABLE: 'Charge variable',
};

/**
 * How the pooled costs get shared across the products made in the period.
 *
 * UNITS is the default: every pair carries the same share of the rent. It is
 * the honest choice for a factory whose products take comparable effort, and
 * it is the one an accountant can check on paper.
 *
 * MATERIAL_COST shares in proportion to what each product consumed — a model
 * built from expensive leather absorbs more overhead. Better when the range
 * is genuinely uneven, misleading when an expensive material happens to be
 * quick to work.
 *
 * Machine hours would be the third, and the data is nearly there
 * (ProductionBatch.startTime/endTime), but those are operator-typed "HH:MM"
 * strings that are often blank — an allocation basis that silently skips half
 * the batches is worse than not offering it.
 */
export const ALLOCATION_BASES = ['UNITS', 'MATERIAL_COST'] as const;
export type AllocationBasis = (typeof ALLOCATION_BASES)[number];

export const ALLOCATION_BASIS_LABELS: Record<AllocationBasis, string> = {
  UNITS: 'Au prorata des unités produites',
  MATERIAL_COST: 'Au prorata du coût des matières',
};

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

export type FinanceWarningCode =
  | 'NO_PRODUCTION'
  | 'NO_ALLOCATION_BASE'
  | 'UNCOSTED_MATERIALS'
  | 'MATERIALS_OVERRIDDEN'
  | 'OVERRIDE_NOT_DISTRIBUTABLE'
  | 'UNATTRIBUTED_DIRECT'
  | 'NO_PRICE_SET';

/**
 * Something the reader has to know before trusting the number next to it.
 *
 * Codes rather than bare strings so the frontend can style them, and so a
 * caller can test for "did this period have any production at all" without
 * matching on French prose.
 */
export interface FinanceWarning {
  code: FinanceWarningCode;
  message: string;
}

function warn(code: FinanceWarningCode, message: string): FinanceWarning {
  return { code, message };
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

/** A half-open range [start, end) — the end month's first day is excluded. */
export interface Period {
  start: Date;
  end: Date;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

/**
 * "2026-08" -> [2026-08-01, 2026-09-01).
 *
 * UTC throughout. A cost dated the 31st must not fall into the next month
 * because the server sits in a different timezone than the factory.
 */
export function monthPeriod(month: string): Period {
  if (!isMonthKey(month)) throw new Error(`Mois invalide : "${month}" (attendu AAAA-MM).`);
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1;
  return {
    start: new Date(Date.UTC(year, index, 1)),
    end: new Date(Date.UTC(year, index + 1, 1)),
  };
}

/** The month a date belongs to, as "YYYY-MM". */
export function monthKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Every month from `from` to `to` inclusive, in order. */
export function monthsInRange(from: string, to: string): string[] {
  const first = monthPeriod(from).start;
  const last = monthPeriod(to).start;
  if (last < first) return [];
  const months: string[] = [];
  const cursor = new Date(first);
  while (cursor <= last) {
    months.push(monthKeyOf(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

/** The range covering a list of months. An empty list gives an empty range. */
export function periodOfMonths(months: string[]): Period {
  if (months.length === 0) {
    const epoch = new Date(0);
    return { start: epoch, end: epoch };
  }
  const sorted = [...months].sort();
  return { start: monthPeriod(sorted[0]).start, end: monthPeriod(sorted[sorted.length - 1]).end };
}

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

export function monthLabel(month: string): string {
  if (!isMonthKey(month)) return month;
  return `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Rates are kept at four decimals — 0.2537 is 25,37 %. */
export function roundRate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function formatAmount(value: number): string {
  return `${roundMoney(value).toLocaleString('fr-FR')} DZD`;
}

// ---------------------------------------------------------------------------
// What production actually cost, per product
// ---------------------------------------------------------------------------

/**
 * One declared production batch, reduced to what finance needs from it.
 *
 * `sellableQuantity` is first + second choice — waste carries no cost share,
 * the same rule the batch screens already use: scrap does not become cheaper
 * shoes, it makes the good ones more expensive.
 */
export interface ProducedBatchLike {
  productItemId: string;
  sellableQuantity: number;
  materialCost: number;
  /** Consumption lines whose material had no known cost — an understatement. */
  uncostedLineCount: number;
}

export interface ProductProduction {
  productItemId: string;
  unitsProduced: number;
  materialCost: number;
  batchCount: number;
  uncostedLineCount: number;
}

export interface ProductionSummary {
  byProduct: Map<string, ProductProduction>;
  totalUnits: number;
  totalMaterialCost: number;
  uncostedLineCount: number;
}

export function summariseProduction(batches: ProducedBatchLike[]): ProductionSummary {
  const byProduct = new Map<string, ProductProduction>();
  let totalUnits = 0;
  let totalMaterialCost = 0;
  let uncostedLineCount = 0;

  for (const batch of batches) {
    const row = byProduct.get(batch.productItemId) ?? {
      productItemId: batch.productItemId,
      unitsProduced: 0,
      materialCost: 0,
      batchCount: 0,
      uncostedLineCount: 0,
    };
    row.unitsProduced += batch.sellableQuantity;
    row.materialCost += batch.materialCost;
    row.batchCount += 1;
    row.uncostedLineCount += batch.uncostedLineCount;
    byProduct.set(batch.productItemId, row);

    totalUnits += batch.sellableQuantity;
    totalMaterialCost += batch.materialCost;
    uncostedLineCount += batch.uncostedLineCount;
  }

  for (const row of byProduct.values()) {
    row.unitsProduced = roundMoney(row.unitsProduced);
    row.materialCost = roundMoney(row.materialCost);
  }

  return {
    byProduct,
    totalUnits: roundMoney(totalUnits),
    totalMaterialCost: roundMoney(totalMaterialCost),
    uncostedLineCount,
  };
}

// ---------------------------------------------------------------------------
// The register — what the Coûts view totals
// ---------------------------------------------------------------------------

export interface CostCategoryLike {
  id: string;
  key: string;
  label: string;
  nature: string;
  behavior: string;
  isMaterials: boolean;
  sortOrder: number;
}

export interface CostEntryLike {
  id: string;
  categoryId: string;
  amount: number;
  productItemId?: string | null;
}

export interface MaterialOverrideLike {
  amount: number;
  reason: string;
}

export interface RegisterLine {
  categoryId: string;
  key: string;
  label: string;
  nature: string;
  behavior: string;
  /** What this category contributes to the period's total. */
  amount: number;
  entryCount: number;
  /**
   * True for the materials line only: summed from production rather than
   * typed, so the UI marks it as computed and offers a correction instead of
   * an edit box.
   */
  derived: boolean;
  /** Materials only — the figure before any correction, always kept visible. */
  computedAmount: number | null;
  override: MaterialOverrideLike | null;
}

export interface RegisterTotals {
  direct: number;
  indirect: number;
  fixed: number;
  variable: number;
  total: number;
}

export interface CostRegister {
  lines: RegisterLine[];
  totals: RegisterTotals;
  warnings: FinanceWarning[];
}

/**
 * Every category with what it cost over the period, plus the four subtotals
 * an accountant actually reads.
 *
 * Categories with nothing in them are kept, not filtered out: an empty
 * "Maintenance" line is information — it says nobody recorded maintenance
 * this month, which is usually a mistake rather than a fact.
 */
export function buildRegister(input: {
  categories: CostCategoryLike[];
  entries: CostEntryLike[];
  /** Summed from production over the same period. */
  materialCost: number;
  uncostedLineCount?: number;
  override?: MaterialOverrideLike | null;
}): CostRegister {
  const { categories, entries, materialCost, override = null } = input;
  const warnings: FinanceWarning[] = [];

  const sums = new Map<string, { amount: number; count: number }>();
  for (const entry of entries) {
    const row = sums.get(entry.categoryId) ?? { amount: 0, count: 0 };
    row.amount += entry.amount;
    row.count += 1;
    sums.set(entry.categoryId, row);
  }

  const lines: RegisterLine[] = [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'fr'))
    .map((category) => {
      const typed = sums.get(category.id) ?? { amount: 0, count: 0 };

      if (category.isMaterials) {
        const computed = roundMoney(materialCost);
        return {
          categoryId: category.id,
          key: category.key,
          label: category.label,
          nature: category.nature,
          behavior: category.behavior,
          amount: override ? roundMoney(override.amount) : computed,
          entryCount: 0,
          derived: true,
          computedAmount: computed,
          override,
        };
      }

      return {
        categoryId: category.id,
        key: category.key,
        label: category.label,
        nature: category.nature,
        behavior: category.behavior,
        amount: roundMoney(typed.amount),
        entryCount: typed.count,
        derived: false,
        computedAmount: null,
        override: null,
      };
    });

  const totals = lines.reduce<RegisterTotals>(
    (acc, line) => {
      acc.total += line.amount;
      if (line.nature === 'DIRECT') acc.direct += line.amount;
      else acc.indirect += line.amount;
      if (line.behavior === 'FIXED') acc.fixed += line.amount;
      else acc.variable += line.amount;
      return acc;
    },
    { direct: 0, indirect: 0, fixed: 0, variable: 0, total: 0 },
  );

  if (override) {
    warnings.push(
      warn(
        'MATERIALS_OVERRIDDEN',
        `Le coût des matières a été corrigé : ${formatAmount(override.amount)} au lieu de ${formatAmount(
          materialCost,
        )} calculé depuis la production. Motif : ${override.reason}`,
      ),
    );
  }
  if ((input.uncostedLineCount ?? 0) > 0) {
    warnings.push(
      warn(
        'UNCOSTED_MATERIALS',
        `${input.uncostedLineCount} ligne(s) de matière consommée sans coût connu : le coût des matières est sous-évalué.`,
      ),
    );
  }

  return {
    lines,
    totals: {
      direct: roundMoney(totals.direct),
      indirect: roundMoney(totals.indirect),
      fixed: roundMoney(totals.fixed),
      variable: roundMoney(totals.variable),
      total: roundMoney(totals.total),
    },
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Absorption — turning a monthly lump into a per-pair number
// ---------------------------------------------------------------------------

export interface ProductCosting {
  productItemId: string;
  unitsProduced: number;
  /** Total over the period, not per unit. Null when nothing was produced. */
  materialCost: number | null;
  directCost: number;
  indirectShare: number | null;

  materialUnitCost: number | null;
  directUnitCost: number | null;
  indirectUnitCost: number | null;
  /** The three above, added. Null when it cannot honestly be computed. */
  unitCost: number | null;

  /** The markup applied — this product's own, or the factory default. */
  margin: number;
  marginIsOverride: boolean;
  suggestedPrice: number | null;

  currentPrice: number | null;
  /** (price − cost) / cost — the same basis as `margin`. */
  currentMarkup: number | null;
  /** (price − cost) / price — the "marge commerciale" an accountant quotes. */
  currentMarginOnPrice: number | null;

  warnings: FinanceWarning[];
}

export interface AllocationDetail {
  basis: AllocationBasis;
  basisLabel: string;
  /** The pooled amount being shared out. */
  pool: number;
  /** What it was divided by — units, or DZD of material. */
  divisor: number;
  /** Printed next to the divisor, e.g. "unités produites". */
  divisorLabel: string;
  /** pool ÷ divisor, so the screen can show the division it performed. */
  ratePerUnitOfBasis: number | null;
}

export interface PricingResult {
  allocation: AllocationDetail;
  products: ProductCosting[];
  warnings: FinanceWarning[];
}

export interface PricedProductLike {
  id: string;
  price?: number | null;
  targetMargin?: number | null;
}

/**
 * The whole calculation, in one pass.
 *
 * Reading order, which is also the order the UI prints it in:
 *   coût matières / unité             (fact, from production)
 * + coûts directs attribués / unité
 * + quote-part des charges indirectes  <- the judgement, with its division shown
 * = coût de revient estimé
 * × (1 + marge)                        -> prix conseillé
 *
 * What lands in the shared pool: every INDIRECT cost, plus every DIRECT cost
 * nobody attributed to a product. That second part is deliberate — an
 * unattributed direct cost is, operationally, an overhead, and silently
 * dropping it would understate every price. It is reported as a warning so
 * the accountant can go and attribute it properly.
 */
export function buildPricing(input: {
  production: ProductionSummary;
  categories: CostCategoryLike[];
  entries: CostEntryLike[];
  products: PricedProductLike[];
  basis: AllocationBasis;
  defaultMargin: number;
  /** Applies to the whole period's material cost; shares scale with it. */
  materialOverride?: MaterialOverrideLike | null;
}): PricingResult {
  const { production, categories, entries, products, basis, defaultMargin, materialOverride = null } = input;
  const warnings: FinanceWarning[] = [];

  const natureOf = new Map(categories.map((c) => [c.id, c.nature]));
  const materialsCategoryIds = new Set(categories.filter((c) => c.isMaterials).map((c) => c.id));

  // Materials never come from typed entries — they are summed from
  // production. Any row that somehow points at the materials category is
  // ignored here rather than double-counted.
  let pool = 0;
  let unattributedDirect = 0;
  const attributedDirect = new Map<string, number>();

  for (const entry of entries) {
    if (materialsCategoryIds.has(entry.categoryId)) continue;
    const nature = natureOf.get(entry.categoryId);
    if (nature === 'DIRECT' && entry.productItemId) {
      attributedDirect.set(entry.productItemId, (attributedDirect.get(entry.productItemId) ?? 0) + entry.amount);
      continue;
    }
    if (nature === 'DIRECT') unattributedDirect += entry.amount;
    pool += entry.amount;
  }

  if (unattributedDirect > 0) {
    warnings.push(
      warn(
        'UNATTRIBUTED_DIRECT',
        `${formatAmount(
          unattributedDirect,
        )} de coûts directs ne sont rattachés à aucun produit : ils sont répartis comme des charges indirectes. Rattachez-les pour un coût de revient plus juste.`,
      ),
    );
  }

  // A correction to the month's materials scales each product's share of it,
  // so the products still add up to what the accountant declared.
  const materialScale =
    materialOverride && production.totalMaterialCost > 0 ? materialOverride.amount / production.totalMaterialCost : 1;
  if (materialOverride && production.totalMaterialCost <= 0) {
    warnings.push(
      warn(
        'OVERRIDE_NOT_DISTRIBUTABLE',
        "La correction du coût des matières ne peut pas être répartie : aucune consommation n'est enregistrée sur la période. Elle apparaît dans le total, mais pas dans le coût unitaire des produits.",
      ),
    );
  }

  const rows = production.byProduct;
  const divisor = basis === 'UNITS' ? production.totalUnits : roundMoney(production.totalMaterialCost * materialScale);
  const divisorLabel = basis === 'UNITS' ? 'unités produites' : 'DZD de matières';

  if (production.totalUnits <= 0) {
    warnings.push(
      warn(
        'NO_PRODUCTION',
        "Aucune production déclarée sur cette période : un coût de revient par unité n'a pas de sens ici.",
      ),
    );
  } else if (divisor <= 0 && pool > 0) {
    warnings.push(
      warn(
        'NO_ALLOCATION_BASE',
        `Les charges à répartir (${formatAmount(
          pool,
        )}) ne peuvent pas l'être : la base choisie (${divisorLabel}) vaut zéro sur la période. Changez de base de répartition.`,
      ),
    );
  }

  const allocation: AllocationDetail = {
    basis,
    basisLabel: ALLOCATION_BASIS_LABELS[basis],
    pool: roundMoney(pool),
    divisor: roundMoney(divisor),
    divisorLabel,
    ratePerUnitOfBasis: divisor > 0 ? roundMoney(pool / divisor) : null,
  };

  const costings: ProductCosting[] = products.map((product) => {
    const produced = rows.get(product.id);
    const units = produced?.unitsProduced ?? 0;
    const productWarnings: FinanceWarning[] = [];

    const materialCost = produced ? roundMoney(produced.materialCost * materialScale) : null;
    const directCost = roundMoney(attributedDirect.get(product.id) ?? 0);

    const share = basis === 'UNITS' ? units : (materialCost ?? 0);
    const indirectShare = divisor > 0 ? roundMoney((pool * share) / divisor) : null;

    const materialUnitCost = units > 0 && materialCost !== null ? roundMoney(materialCost / units) : null;
    const directUnitCost = units > 0 ? roundMoney(directCost / units) : null;
    const indirectUnitCost = units > 0 && indirectShare !== null ? roundMoney(indirectShare / units) : null;

    // Null, never zero: "we don't know what this costs" and "this costs
    // nothing" must not look the same on a pricing screen.
    const unitCost =
      units > 0 && materialUnitCost !== null && indirectUnitCost !== null
        ? roundMoney(materialUnitCost + (directUnitCost ?? 0) + indirectUnitCost)
        : null;

    if (units <= 0) {
      productWarnings.push(
        warn(
          'NO_PRODUCTION',
          "Aucune production de ce produit sur la période : son coût de revient ne peut pas être calculé.",
        ),
      );
    }
    if ((produced?.uncostedLineCount ?? 0) > 0) {
      productWarnings.push(
        warn('UNCOSTED_MATERIALS', `${produced?.uncostedLineCount} matière(s) consommée(s) sans coût connu : coût sous-évalué.`),
      );
    }

    const marginIsOverride = product.targetMargin != null;
    const margin = product.targetMargin ?? defaultMargin;
    const suggestedPrice = unitCost === null ? null : roundMoney(unitCost * (1 + margin));

    const currentPrice = product.price ?? null;
    if (currentPrice == null) {
      productWarnings.push(
        warn('NO_PRICE_SET', "Ce produit n'a pas de prix de vente enregistré : la comparaison est impossible."),
      );
    }

    return {
      productItemId: product.id,
      unitsProduced: units,
      materialCost,
      directCost,
      indirectShare,
      materialUnitCost,
      directUnitCost,
      indirectUnitCost,
      unitCost,
      margin: roundRate(margin),
      marginIsOverride,
      suggestedPrice,
      currentPrice,
      currentMarkup: markupOf(currentPrice, unitCost),
      currentMarginOnPrice: marginOnPriceOf(currentPrice, unitCost),
      warnings: productWarnings,
    };
  });

  return { allocation, products: costings, warnings };
}

/**
 * Markup — what the target margin is expressed in. (price − cost) / cost.
 *
 * Null when the cost is unknown or zero: a percentage against a zero base is
 * infinity, not a good deal.
 */
export function markupOf(price: number | null, cost: number | null): number | null {
  if (price == null || cost == null || cost <= 0) return null;
  return roundRate((price - cost) / cost);
}

/**
 * Marge commerciale — (price − cost) / price. Shown beside the markup because
 * the two are routinely confused and differ a lot: a 25 % markup is a 20 %
 * margin on price.
 */
export function marginOnPriceOf(price: number | null, cost: number | null): number | null {
  if (price == null || cost == null || price <= 0) return null;
  return roundRate((price - cost) / price);
}

export function suggestedPriceOf(unitCost: number | null, margin: number): number | null {
  if (unitCost == null) return null;
  return roundMoney(unitCost * (1 + margin));
}
