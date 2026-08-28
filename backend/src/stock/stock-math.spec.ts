import { describe, expect, it } from 'vitest';
import {
  getBatchesWithRemaining,
  getExpiryStatus,
  getFifoBatch,
  getItemQuantity,
  getLatestSupplier,
  getQualityCounts,
  getRecommendedBatch,
  getStockStatus,
  getUnaccounted,
  isLowStock,
  type BatchLike,
  type MovementDetail,
  type MovementLike,
} from './stock-math.js';

function mv(partial: Partial<MovementLike> & Pick<MovementLike, 'itemId' | 'direction' | 'quantity'>): MovementLike {
  return { batchId: null, ...partial };
}

function detail(
  partial: Partial<MovementDetail> & Pick<MovementDetail, 'itemId' | 'direction' | 'quantity' | 'date'>,
): MovementDetail {
  return { batchId: null, supplier: null, ...partial };
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

describe('getQualityCounts + getUnaccounted', () => {
  it('splits IN − OUT per quality class for the item only', () => {
    const movements: MovementLike[] = [
      mv({ itemId: 'fg', direction: 'IN', quantity: 1000, quality: '1er' }),
      mv({ itemId: 'fg', direction: 'IN', quantity: 200, quality: '2ème' }),
      mv({ itemId: 'fg', direction: 'IN', quantity: 60, quality: 'rebut' }),
      mv({ itemId: 'fg', direction: 'OUT', quantity: 850, quality: '1er' }),
      mv({ itemId: 'fg', direction: 'OUT', quantity: 120, quality: '2ème' }),
      mv({ itemId: 'other', direction: 'IN', quantity: 999, quality: '1er' }), // must not leak
    ];
    const counts = getQualityCounts(movements, 'fg');
    expect(counts['1er']).toBe(150);
    expect(counts['2ème']).toBe(80);
    expect(counts['rebut']).toBe(60);
    expect(getUnaccounted(counts)).toBe(0);
  });

  it('defaults every class to 0 when the item has no movements', () => {
    const counts = getQualityCounts([], 'fg');
    expect(counts['1er']).toBe(0);
    expect(counts['2ème']).toBe(0);
    expect(counts['rebut']).toBe(0);
    expect(getUnaccounted(counts)).toBe(0);
  });

  it('flags untagged movements as unaccounted — units no production record explains', () => {
    const movements: MovementLike[] = [
      mv({ itemId: 'fg', direction: 'IN', quantity: 1000, quality: '1er' }),
      mv({ itemId: 'fg', direction: 'IN', quantity: 25 }), // mystery stock, no quality tag
      mv({ itemId: 'fg', direction: 'OUT', quantity: 800, quality: '1er', reason: 'Vente' }),
    ];
    const counts = getQualityCounts(movements, 'fg');
    expect(counts['1er']).toBe(200);
    expect(getUnaccounted(counts)).toBe(25);
  });
});

describe('getLatestSupplier', () => {
  const a = { id: 's-a', name: 'Fournitures Batna' };
  const b = { id: 's-b', name: 'Chim Serkadji' };

  it('returns the supplier of the most recent receive for the item', () => {
    const movements: MovementDetail[] = [
      detail({ itemId: 't', direction: 'OUT', quantity: 5, date: new Date('2026-08-27'), supplier: null }),
      detail({ itemId: 't', direction: 'IN', quantity: 200, date: new Date('2026-08-10'), supplier: a }),
      detail({ itemId: 't', direction: 'IN', quantity: 100, date: new Date('2026-08-20'), supplier: b }),
    ];
    expect(getLatestSupplier(movements, 't')).toEqual(b);
  });

  it('ignores manual receive without a supplier and other items', () => {
    const movements: MovementDetail[] = [
      detail({ itemId: 't', direction: 'IN', quantity: 30, date: new Date('2026-08-20'), supplier: null }),
      detail({ itemId: 'other', direction: 'IN', quantity: 99, date: new Date('2026-08-25'), supplier: a }),
    ];
    expect(getLatestSupplier(movements, 't')).toBeNull();
  });

  it('returns null when the item only has usage (OUT) movements', () => {
    const movements: MovementDetail[] = [detail({ itemId: 't', direction: 'OUT', quantity: 8, date: new Date('2026-08-26') })];
    expect(getLatestSupplier(movements, 't')).toBeNull();
  });
});

describe('isLowStock', () => {
  it('flags stock at or below the threshold', () => {
    expect(isLowStock(10, 10)).toBe(true);
    expect(isLowStock(9, 10)).toBe(true);
    expect(isLowStock(11, 10)).toBe(false);
  });
});

describe('getStockStatus', () => {
  it('is low at or below the reorder threshold', () => {
    expect(getStockStatus(10, 10)).toBe('low');
    expect(getStockStatus(0, 10)).toBe('low');
  });

  it('is mid above the threshold but still within twice it', () => {
    expect(getStockStatus(15, 10)).toBe('mid');
    expect(getStockStatus(20, 10)).toBe('mid');
  });

  it('is good beyond the mid window', () => {
    expect(getStockStatus(21, 10)).toBe('good');
    expect(getStockStatus(100, 10)).toBe('good');
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

  it('orders batches oldest-received first (FIFO) when there is no expiry info', () => {
    const movements: MovementLike[] = [
      mv({ itemId: 'item-1', batchId: 'b-new', direction: 'IN', quantity: 10 }),
      mv({ itemId: 'item-1', batchId: 'b-old', direction: 'IN', quantity: 10 }),
    ];
    const result = getBatchesWithRemaining(batches, movements, 'item-1', today);
    expect(result.map((b) => b.id)).toEqual(['b-old', 'b-new']);
  });

  it('orders expiring batches first by earliest expiry (FEFO), newest received late still wins', () => {
    const expiringBatches: BatchLike[] = [
      { id: 'later-received', itemId: 'item-1', batchNumber: 'L2', receivedDate: new Date('2026-02-10'), expiryDate: new Date('2026-03-20') },
      { id: 'earlier-received', itemId: 'item-1', batchNumber: 'L1', receivedDate: new Date('2026-02-01'), expiryDate: new Date('2026-04-05') },
      { id: 'b-new', itemId: 'item-1', batchNumber: 'NEW', receivedDate: new Date('2026-02-01'), expiryDate: null },
    ];
    const movements: MovementLike[] = [
      mv({ itemId: 'item-1', batchId: 'later-received', direction: 'IN', quantity: 10 }),
      mv({ itemId: 'item-1', batchId: 'b-new', direction: 'IN', quantity: 10 }),
      mv({ itemId: 'item-1', batchId: 'earlier-received', direction: 'IN', quantity: 10 }),
    ];
    const result = getBatchesWithRemaining(expiringBatches, movements, 'item-1', today);
    expect(result.map((b) => b.id)).toEqual(['later-received', 'earlier-received', 'b-new']);
  });

  it('picks the earliest-expiring batch that still has stock (FEFO first-out)', () => {
    const expiringBatches: BatchLike[] = [
      { id: 'b-safe', itemId: 'item-1', batchNumber: 'L2', receivedDate: new Date('2026-02-01'), expiryDate: new Date('2026-06-01') },
      { id: 'b-soon', itemId: 'item-1', batchNumber: 'L1', receivedDate: new Date('2026-02-01'), expiryDate: new Date('2026-03-15') },
    ];
    const movements: MovementLike[] = [
      mv({ itemId: 'item-1', batchId: 'b-soon', direction: 'IN', quantity: 5 }),
      mv({ itemId: 'item-1', batchId: 'b-safe', direction: 'IN', quantity: 9 }),
    ];
    const fifo = getFifoBatch(getBatchesWithRemaining(expiringBatches, movements, 'item-1', today));
    expect(fifo?.id).toBe('b-soon');
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

describe('getRecommendedBatch', () => {
  const today = new Date('2026-03-01');

  it('skips expired lots while any usable stock remains', () => {
    const expiringBatches: BatchLike[] = [
      { id: 'b-expired', itemId: 'item-1', batchNumber: 'E', receivedDate: new Date('2026-01-01'), expiryDate: new Date('2026-02-01') },
      { id: 'b-safe', itemId: 'item-1', batchNumber: 'S', receivedDate: new Date('2026-01-10'), expiryDate: new Date('2026-06-01') },
    ];
    const movements: MovementLike[] = [
      mv({ itemId: 'item-1', batchId: 'b-expired', direction: 'IN', quantity: 3 }),
      mv({ itemId: 'item-1', batchId: 'b-safe', direction: 'IN', quantity: 7 }),
    ];
    const list = getBatchesWithRemaining(expiringBatches, movements, 'item-1', today);
    expect(getRecommendedBatch(list)?.id).toBe('b-safe');
  });

  it('falls back to the first lot with stock when everything left is expired', () => {
    const expiringBatches: BatchLike[] = [
      { id: 'b-expired', itemId: 'item-1', batchNumber: 'E', receivedDate: new Date('2026-01-01'), expiryDate: new Date('2026-02-01') },
      { id: 'b-gone', itemId: 'item-1', batchNumber: 'G', receivedDate: new Date('2026-01-10'), expiryDate: new Date('2026-05-01') },
    ];
    const movements: MovementLike[] = [
      mv({ itemId: 'item-1', batchId: 'b-expired', direction: 'IN', quantity: 4 }),
    ];
    const list = getBatchesWithRemaining(expiringBatches, movements, 'item-1', today);
    expect(getRecommendedBatch(list)?.id).toBe('b-expired');
  });
});
