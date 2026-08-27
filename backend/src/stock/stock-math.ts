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

export function isLowStock(quantity: number, threshold: number): boolean {
  return quantity <= threshold;
}

export function getExpiryStatus(expiryDate: Date | null, today: Date, warnDays = DEFAULT_WARNING_DAYS): ExpiryStatus {
  if (!expiryDate) return 'none';
  const daysLeft = daysBetween(today, expiryDate);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= warnDays) return 'warning';
  return 'ok';
}

/**
 * Batches for one item, oldest received first (FIFO), annotated with what's
 * actually left in each. This is what the "log usage" endpoint offers as
 * choices, so the oldest batch with stock is always the default.
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
    .sort((a, b) => a.receivedDate.getTime() - b.receivedDate.getTime());
}

export function getFifoBatch(batchesWithRemaining: BatchWithRemaining[]): BatchWithRemaining | null {
  return batchesWithRemaining.find((b) => b.remaining > 0) ?? null;
}
