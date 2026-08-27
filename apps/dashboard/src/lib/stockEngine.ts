import type { Batch, BatchWithRemaining, ExpiryStatus, Item, Movement } from "./types";

const EXPIRY_WARNING_DAYS = 30;

/** Quantity is never stored directly — it is always the sum of that item's movements. */
export function getItemQuantity(movements: Movement[], itemId: string): number {
  let total = 0;
  for (const m of movements) {
    if (m.itemId !== itemId) continue;
    total += m.direction === "in" ? m.quantity : -m.quantity;
  }
  return total;
}

export function getItemMovements(movements: Movement[], itemId: string): Movement[] {
  return movements
    .filter((m) => m.itemId === itemId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function getBatchQuantity(movements: Movement[], batchId: string): number {
  let total = 0;
  for (const m of movements) {
    if (m.batchId !== batchId) continue;
    total += m.direction === "in" ? m.quantity : -m.quantity;
  }
  return total;
}

export function isLowStock(quantity: number, threshold: number): boolean {
  return quantity <= threshold;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso + "T00:00:00");
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function getExpiryStatus(
  expiryDate: string | null,
  today: string,
  warnDays: number = EXPIRY_WARNING_DAYS,
): ExpiryStatus {
  if (!expiryDate) return "none";
  const daysLeft = daysBetween(today, expiryDate);
  if (daysLeft < 0) return "expired";
  if (daysLeft <= warnDays) return "warning";
  return "ok";
}

/**
 * Batches for one item, oldest first (FIFO), with only what's actually left in each —
 * this is what the reception/usage screens use so the oldest batch is always the default.
 */
export function getBatchesWithRemaining(
  batches: Batch[],
  movements: Movement[],
  itemId: string,
  today: string,
): BatchWithRemaining[] {
  return batches
    .filter((b) => b.itemId === itemId)
    .map((b) => ({
      ...b,
      remaining: getBatchQuantity(movements, b.id),
      status: getExpiryStatus(b.expiryDate, today),
    }))
    .sort((a, b) => a.receivedDate.localeCompare(b.receivedDate));
}

export function getFifoBatch(batchesWithRemaining: BatchWithRemaining[]): BatchWithRemaining | null {
  return batchesWithRemaining.find((b) => b.remaining > 0) ?? null;
}

export interface StockSummary {
  itemId: string;
  quantity: number;
  low: boolean;
}

export function summarizeItems(items: Item[], movements: Movement[]): StockSummary[] {
  return items.map((item) => {
    const quantity = getItemQuantity(movements, item.id);
    return { itemId: item.id, quantity, low: isLowStock(quantity, item.reorderThreshold) };
  });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
