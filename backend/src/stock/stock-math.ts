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

/** A movement row as loaded from the DB — everything MovementLike has, plus date and the joined supplier. */
export interface MovementDetail extends MovementLike {
  date: Date;
  supplier?: { id: string; name: string } | null;
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
