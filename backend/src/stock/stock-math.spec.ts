import { describe, expect, it } from 'vitest';
import { getBatchesWithRemaining, getExpiryStatus, getFifoBatch, getItemQuantity, isLowStock, type BatchLike, type MovementLike } from './stock-math.js';

function mv(partial: Partial<MovementLike> & Pick<MovementLike, 'itemId' | 'direction' | 'quantity'>): MovementLike {
  return { batchId: null, ...partial };
}

describe('getItemQuantity', () => {
  it('sums IN minus OUT for the given item only', () => {
    const movements: MovementLike[] = [
      mv({ itemId: 'a', direction: 'IN', quantity: 40 }),
      mv({ itemId: 'a', direction: 'OUT', quantity: 15 }),
      mv({ itemId: 'b', direction: 'IN', quantity: 1000 }), // must not leak into item a's total
    ];
    expect(getItemQuantity(movements, 'a')).toBe(25);
  });

  it('returns 0 for an item with no movements', () => {
    expect(getItemQuantity([], 'unknown')).toBe(0);
  });
});

describe('isLowStock', () => {
  it('flags stock at or below the threshold', () => {
    expect(isLowStock(10, 10)).toBe(true);
    expect(isLowStock(9, 10)).toBe(true);
    expect(isLowStock(11, 10)).toBe(false);
  });
});

describe('getExpiryStatus', () => {
  const today = new Date('2026-06-15T00:00:00.000Z');

  it('has no status when there is no expiry date', () => {
    expect(getExpiryStatus(null, today)).toBe('none');
  });

  it('is expired once the date has passed', () => {
    expect(getExpiryStatus(new Date('2026-06-14T00:00:00.000Z'), today)).toBe('expired');
  });

  it('warns inside the warning window, including exactly at the edge', () => {
    expect(getExpiryStatus(new Date('2026-06-20T00:00:00.000Z'), today, 30)).toBe('warning');
    expect(getExpiryStatus(new Date('2026-07-15T00:00:00.000Z'), today, 30)).toBe('warning');
  });

  it('is ok beyond the warning window', () => {
    expect(getExpiryStatus(new Date('2026-08-01T00:00:00.000Z'), today, 30)).toBe('ok');
  });
});

describe('getBatchesWithRemaining + getFifoBatch', () => {
  const batches: BatchLike[] = [
    { id: 'b-new', itemId: 'item-1', batchNumber: 'NEW', receivedDate: new Date('2026-02-01'), expiryDate: null },
    { id: 'b-old', itemId: 'item-1', batchNumber: 'OLD', receivedDate: new Date('2026-01-01'), expiryDate: null },
  ];
  const today = new Date('2026-03-01');

  it('orders batches oldest-received first regardless of input order', () => {
    const movements: MovementLike[] = [
      mv({ itemId: 'item-1', batchId: 'b-new', direction: 'IN', quantity: 10 }),
      mv({ itemId: 'item-1', batchId: 'b-old', direction: 'IN', quantity: 10 }),
    ];
    const result = getBatchesWithRemaining(batches, movements, 'item-1', today);
    expect(result.map((b) => b.id)).toEqual(['b-old', 'b-new']);
  });

  it('picks the oldest batch that still has stock, skipping exhausted ones', () => {
    const movements: MovementLike[] = [
      mv({ itemId: 'item-1', batchId: 'b-old', direction: 'IN', quantity: 10 }),
      mv({ itemId: 'item-1', batchId: 'b-old', direction: 'OUT', quantity: 10 }), // fully used
      mv({ itemId: 'item-1', batchId: 'b-new', direction: 'IN', quantity: 5 }),
    ];
    const fifo = getFifoBatch(getBatchesWithRemaining(batches, movements, 'item-1', today));
    expect(fifo?.id).toBe('b-new');
    expect(fifo?.remaining).toBe(5);
  });

  it('returns null when every batch is exhausted', () => {
    const movements: MovementLike[] = [
      mv({ itemId: 'item-1', batchId: 'b-old', direction: 'IN', quantity: 4 }),
      mv({ itemId: 'item-1', batchId: 'b-old', direction: 'OUT', quantity: 4 }),
    ];
    const fifo = getFifoBatch(getBatchesWithRemaining(batches, movements, 'item-1', today));
    expect(fifo).toBeNull();
  });
});
