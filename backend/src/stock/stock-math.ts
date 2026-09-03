/**
 * Pure, framework-free stock arithmetic — no Prisma, no HTTP, just plain
 * data in and plain data out. This is the backend's copy of the same rules
 * the frontend originally implemented client-side in
 * apps/dashboard/src/lib/stockEngine.ts before Stock moved onto this API;
 * the backend is now the single authority for these numbers.
 *
 * Keeping this logic in pure functions (rather than inline in
 * stock.service.ts) means it can be unit tested without a database — see
 * stock-math.spec.ts.
 */

import { t, type MessageKey } from '../i18n/messages/index.js';

export interface MovementLike {
  itemId: string;
  batchId: string | null;
  direction: string; // "IN" | "OUT"
  quantity: number;
  /** Production character classification for finished goods: "1er", "2ème", "rebut" — or null. */
  quality?: string | null;
}

/** The three quality classes produced goods are split into. */
export const QUALITY_CLASSES = ['1er', '2ème', 'rebut'] as const;
export type QualityClass = (typeof QUALITY_CLASSES)[number];

/**
 * A movement row as loaded from the DB — everything MovementLike has, plus
 * date, the joined supplier, and the cost/provenance fields the valuation
 * reads (see "COSTING & VALUATION" at the bottom of this file).
 */
export interface MovementDetail extends MovementLike {
  date: Date;
  supplier?: { id: string; name: string } | null;
  unitCost?: number | null;
  sourceType?: string | null;
  sourceRef?: string | null;
}

export interface BatchLike {
  id: string;
  itemId: string;
  batchNumber: string;
  receivedDate: Date;
  expiryDate: Date | null;
}

export type ExpiryStatus = 'expired' | 'warning' | 'ok' | 'none';

export interface BatchWithRemaining extends BatchLike {
  remaining: number;
  status: ExpiryStatus;
}

const DAY_MS = 86_400_000;
const DEFAULT_WARNING_DAYS = 30;

function toUtcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / DAY_MS);
}

/** Quantity is never stored directly — always the sum of that item's movements. */
export function getItemQuantity(movements: MovementLike[], itemId: string): number {
  let total = 0;
  for (const m of movements) {
    if (m.itemId !== itemId) continue;
    total += m.direction === 'IN' ? m.quantity : -m.quantity;
  }
  return total;
}

export function getBatchQuantity(movements: MovementLike[], batchId: string): number {
  let total = 0;
  for (const m of movements) {
    if (m.batchId !== batchId) continue;
    total += m.direction === 'IN' ? m.quantity : -m.quantity;
  }
  return total;
}

/**
 * Quantity held per production-quality class (IN − OUT per tag), for finished
 * goods. Movements without a quality tag are intentionally NOT part of any
 * class — their net is the "unaccounted" figure the reconciliation surfaces.
 */
export function getQualityCounts(
  movements: MovementLike[],
  itemId: string,
  classes: readonly QualityClass[] = QUALITY_CLASSES,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of movements) {
    if (m.itemId !== itemId) continue;
    const key = m.quality ?? 'unclassified';
    counts[key] = (counts[key] ?? 0) + (m.direction === 'IN' ? m.quantity : -m.quantity);
  }
  for (const c of classes) counts[c] = counts[c] ?? 0;
  counts.unclassified = counts.unclassified ?? 0;
  return counts;
}

/**
 * Units on the books that belong to no quality class — stock some production
 * record doesn't explain. This is the owner's core problem made measurable:
 * the residual between the computed quantity and the sum of the classified
 * buckets.
 */
export function getUnaccounted(counts: Record<string, number>): number {
  return counts.unclassified ?? 0;
}

/**
 * The supplier of the most recent receive (IN) of this item — what the stock
 * table shows as the item's "supplier". Returns null when the item was never
 * received from anyone. Ties (same date) keep the later movement in the list.
 */
export function getLatestSupplier(movements: MovementDetail[], itemId: string): { id: string; name: string } | null {
  let best: { id: string; name: string } | null = null;
  let bestDate = -Infinity;
  for (const m of movements) {
    if (m.itemId !== itemId || m.direction !== 'IN' || !m.supplier) continue;
    if (m.date.getTime() >= bestDate) {
      bestDate = m.date.getTime();
      best = m.supplier;
    }
  }
  return best;
}

export function isLowStock(quantity: number, threshold: number): boolean {
  return quantity <= threshold;
}

export type StockStatus = 'good' | 'mid' | 'low';

/**
 * Three-tier stock condition (spec: Good / Mid / Low) instead of a binary
 * ok/low flag. "Low" matches `isLowStock` (at or below the reorder threshold);
 * "mid" is above the threshold but still within `midFactor` of it (default 2× —
 * i.e. anything below twice the reorder level); everything else is "good".
 */
export function getStockStatus(quantity: number, threshold: number, midFactor = 2): StockStatus {
  if (quantity <= threshold) return 'low';
  if (quantity <= threshold * midFactor) return 'mid';
  return 'good';
}

export function getExpiryStatus(expiryDate: Date | null, today: Date, warnDays = DEFAULT_WARNING_DAYS): ExpiryStatus {
  if (!expiryDate) return 'none';
  const daysLeft = daysBetween(today, expiryDate);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= warnDays) return 'warning';
  return 'ok';
}

/**
 * Batches for one item, consumption-priority order, annotated with what's
 * actually left in each. This is what the "log usage" endpoint offers as
 * choices, so the highest-priority batch with stock is always the default.
 *
 * Ordering is FEFO — First Expired, First Out — for expiry-tracked stock
 * (chemicals): the batch with the earliest valid expiry comes first, so it is
 * consumed before it spoils. FIFO (oldest received first) is the fallback:
 * batches without an expiry date sort among themselves by received date and
 * behind any batch that does expire, so a never-expiring lot is never
 * consumed before an expiring one.
 */
export function getBatchesWithRemaining(
  batches: BatchLike[],
  movements: MovementLike[],
  itemId: string,
  today: Date,
): BatchWithRemaining[] {
  return batches
    .filter((b) => b.itemId === itemId)
    .map((b) => ({
      ...b,
      remaining: getBatchQuantity(movements, b.id),
      status: getExpiryStatus(b.expiryDate, today),
    }))
    .sort((a, b) => {
      const aExpiry = a.expiryDate?.getTime() ?? Infinity;
      const bExpiry = b.expiryDate?.getTime() ?? Infinity;
      if (aExpiry !== bExpiry) return aExpiry - bExpiry;
      return a.receivedDate.getTime() - b.receivedDate.getTime();
    });
}

/**
 * The batch to draw from next: the first one that still has stock, in FEFO
 * (then FIFO) consumption-priority order. For chemicals this is the lot the
 * workshop should pick up first; expired lots still count (they must be
 * written off before anything else) unless there is none left.
 */
export function getFifoBatch(batchesWithRemaining: BatchWithRemaining[]): BatchWithRemaining | null {
  return batchesWithRemaining.find((b) => b.remaining > 0) ?? null;
}

/**
 * The batch to recommend next, from a consumption-priority list: the first
 * with stock that is not yet expired ("earliest valid expiration first",
 * per the FEFO rule). Falls back to the raw first-with-stock when every
 * remaining lot is already expired.
 */
export function getRecommendedBatch(batchesWithRemaining: BatchWithRemaining[]): BatchWithRemaining | null {
  const usable = batchesWithRemaining.find((b) => b.remaining > 0 && b.status !== 'expired');
  return usable ?? getFifoBatch(batchesWithRemaining);
}

// ===========================================================================
// COSTING & VALUATION
// ===========================================================================
//
// What the stock is worth, and where that value came from.
//
// The rule is the same one quantity follows: nothing is stored. An item's
// unit cost is always recomputed from the IN movements that actually paid for
// it — a reception typed by hand, a purchase receipt, a supplier delivery, a
// production batch crediting its output. `Item.unitCost` is only the fallback
// for movements that carry no cost of their own (rows written before costs
// were tracked, or a reception nobody priced).
//
// The method is the weighted average: every unit in stock is valued at the
// average of what the units bought were paid for, not at the newest price.
// FIFO layers would be more precise, but they only pay off when purchase
// prices swing hard, and they cost the one thing this system is for — being
// able to explain a number to the person who typed it in.

/** Where an IN movement came from. Plain strings — see Movement.sourceType. */
export const MOVEMENT_SOURCES = ['MANUAL', 'SUPPLIER_ORDER', 'PURCHASE', 'PRODUCTION', 'SALE'] as const;
export type MovementSource = (typeof MOVEMENT_SOURCES)[number];

/** Translated labels for the provenance shown next to each entry in the item fiche. */
export const MOVEMENT_SOURCE_KEYS: Record<MovementSource, MessageKey> = {
  MANUAL: 'stock.source.manual',
  SUPPLIER_ORDER: 'stock.source.supplierOrder',
  PURCHASE: 'stock.source.purchase',
  PRODUCTION: 'stock.source.production',
  SALE: 'stock.source.sale',
};

/** A movement with the money on it. Everything MovementLike has, plus cost and provenance. */
export interface CostedMovement extends MovementLike {
  unitCost?: number | null;
  sourceType?: string | null;
  sourceRef?: string | null;
}

export interface ValuationLike {
  /** Weighted average cost of one unit, in DZD. Null when nothing is priced. */
  averageUnitCost: number | null;
  /** quantity × averageUnitCost. Null when there is no average to apply. */
  stockValue: number | null;
  /** How much of what came in carries a known cost — the average's basis. */
  valuedQuantity: number;
  /** How much came in with no price at all. A non-zero figure means the
   *  average describes only part of the history, and the UI says so. */
  uncostedQuantity: number;
}

/** One provenance bucket: what arrived from a given source, and what it cost. */
export interface CostSource {
  source: string;
  label: string;
  quantity: number;
  /** Σ(quantity × unit cost) over that source's entries, in DZD. */
  value: number;
  /** value ÷ quantity — the average price this source charged. */
  averageUnitCost: number | null;
  /** The documents behind it, e.g. ["BC-2026-0007"]. Capped for display. */
  references: string[];
  /** Entries from this source that carried no price. */
  uncostedQuantity: number;
}

/** The cost to attribute to one movement: its own, else the item's standard. */
export function movementUnitCost(movement: CostedMovement, fallbackUnitCost?: number | null): number | null {
  if (movement.unitCost != null) return movement.unitCost;
  return fallbackUnitCost ?? null;
}

/**
 * Weighted average cost of one unit of an item, over everything that ever
 * came in. Returns null when the cost is genuinely unknown — no priced entry
 * AND no standard cost on the article — rather than quietly valuing it at
 * zero.
 *
 * An article that has a standard cost but no entries yet (just created, never
 * received) reports that standard cost: it is what the factory knows one unit
 * costs, and showing "—" next to a price somebody just typed reads as the
 * system having lost it.
 */
export function getAverageUnitCost(
  movements: CostedMovement[],
  itemId: string,
  fallbackUnitCost?: number | null,
): number | null {
  const { valuedQuantity, value } = accumulateCost(movements, (m) => m.itemId === itemId, fallbackUnitCost);
  if (valuedQuantity <= 0) return fallbackUnitCost ?? null;
  return roundMoney(value / valuedQuantity);
}

/** The same average, restricted to one stock lot (chemicals). */
export function getBatchUnitCost(
  movements: CostedMovement[],
  batchId: string,
  fallbackUnitCost?: number | null,
): number | null {
  const { valuedQuantity, value } = accumulateCost(movements, (m) => m.batchId === batchId, fallbackUnitCost);
  if (valuedQuantity <= 0) return fallbackUnitCost ?? null;
  return roundMoney(value / valuedQuantity);
}

/** What an item's stock on hand is worth, and how well that figure is backed. */
export function getItemValuation(
  movements: CostedMovement[],
  itemId: string,
  quantity: number,
  fallbackUnitCost?: number | null,
): ValuationLike {
  const { valuedQuantity, value, uncostedQuantity } = accumulateCost(
    movements,
    (m) => m.itemId === itemId,
    fallbackUnitCost,
  );
  const averageUnitCost = valuedQuantity > 0 ? roundMoney(value / valuedQuantity) : (fallbackUnitCost ?? null);
  return {
    averageUnitCost,
    stockValue: averageUnitCost === null ? null : roundMoney(quantity * averageUnitCost),
    valuedQuantity: roundMoney(valuedQuantity),
    uncostedQuantity: roundMoney(uncostedQuantity),
  };
}

/**
 * Where an item's value came from, split by provenance: so much from purchase
 * orders at so much a unit, so much from direct receptions, so much credited
 * by production. This is what the item fiche shows under its total — a
 * valuation nobody can trace back to a document is a number, not an answer.
 */
export function getCostSources(
  movements: CostedMovement[],
  itemId: string,
  fallbackUnitCost?: number | null,
  maxReferences = 6,
): CostSource[] {
  const buckets = new Map<string, CostSource>();

  for (const m of movements) {
    if (m.itemId !== itemId || m.direction !== 'IN') continue;
    const source = m.sourceType ?? 'MANUAL';
    let bucket = buckets.get(source);
    if (!bucket) {
      bucket = {
        source,
        label: source in MOVEMENT_SOURCE_KEYS ? t(MOVEMENT_SOURCE_KEYS[source as MovementSource]) : source,
        quantity: 0,
        value: 0,
        averageUnitCost: null,
        references: [],
        uncostedQuantity: 0,
      };
      buckets.set(source, bucket);
    }

    bucket.quantity += m.quantity;
    const unitCost = movementUnitCost(m, fallbackUnitCost);
    if (unitCost === null) bucket.uncostedQuantity += m.quantity;
    else bucket.value += m.quantity * unitCost;
    if (m.sourceRef && !bucket.references.includes(m.sourceRef) && bucket.references.length < maxReferences) {
      bucket.references.push(m.sourceRef);
    }
  }

  return [...buckets.values()]
    .map((b) => {
      const valued = b.quantity - b.uncostedQuantity;
      return {
        ...b,
        quantity: roundMoney(b.quantity),
        value: roundMoney(b.value),
        uncostedQuantity: roundMoney(b.uncostedQuantity),
        averageUnitCost: valued > 0 ? roundMoney(b.value / valued) : null,
      };
    })
    .sort((a, b) => b.value - a.value);
}

function accumulateCost(
  movements: CostedMovement[],
  matches: (m: CostedMovement) => boolean,
  fallbackUnitCost?: number | null,
): { valuedQuantity: number; value: number; uncostedQuantity: number } {
  let valuedQuantity = 0;
  let value = 0;
  let uncostedQuantity = 0;
  for (const m of movements) {
    if (!matches(m) || m.direction !== 'IN') continue;
    const unitCost = movementUnitCost(m, fallbackUnitCost);
    if (unitCost === null) {
      uncostedQuantity += m.quantity;
      continue;
    }
    valuedQuantity += m.quantity;
    value += m.quantity * unitCost;
  }
  return { valuedQuantity, value, uncostedQuantity };
}

/** Money for a factory: two decimals, and no 0.1 + 0.2 artefacts. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
