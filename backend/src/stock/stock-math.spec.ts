import { describe, expect, it } from 'vitest';
import {
  getAverageUnitCost,
  getBatchesWithRemaining,
  getBatchUnitCost,
  getCostSources,
  getExpiryStatus,
  getFifoBatch,
  getItemQuantity,
  getItemValuation,
  getLatestSupplier,
  getQualityCounts,
  getRecommendedBatch,
  getStockStatus,
  getUnaccounted,
  isLowStock,
  type BatchLike,
  type CostedMovement,
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


// ===========================================================================
// COSTING & VALUATION
// ===========================================================================

function cost(
  partial: Partial<CostedMovement> & Pick<CostedMovement, 'itemId' | 'direction' | 'quantity'>,
): CostedMovement {
  return { batchId: null, ...partial };
}

describe('getAverageUnitCost', () => {
  it('weights each entry by its quantity, not by how many entries there were', () => {
    // 100 kg at 200 DZD and 900 kg at 100 DZD is 110 DZD a kg — not 150.
    const movements = [
      cost({ itemId: 'ch', direction: 'IN', quantity: 100, unitCost: 200 }),
      cost({ itemId: 'ch', direction: 'IN', quantity: 900, unitCost: 100 }),
    ];
    expect(getAverageUnitCost(movements, 'ch')).toBe(110);
  });

  it('ignores what left the shelf — consumption spends value, it does not reprice it', () => {
    const movements = [
      cost({ itemId: 'ch', direction: 'IN', quantity: 100, unitCost: 50 }),
      cost({ itemId: 'ch', direction: 'OUT', quantity: 90, unitCost: 50 }),
    ];
    expect(getAverageUnitCost(movements, 'ch')).toBe(50);
  });

  it("falls back to the article's standard cost for entries nobody priced", () => {
    const movements = [cost({ itemId: 'ch', direction: 'IN', quantity: 10 })];
    expect(getAverageUnitCost(movements, 'ch', 75)).toBe(75);
  });

  it('reports an unknown cost as unknown rather than as zero', () => {
    const movements = [cost({ itemId: 'ch', direction: 'IN', quantity: 10 })];
    expect(getAverageUnitCost(movements, 'ch')).toBeNull();
  });

  it("reports the article's standard cost when nothing has come in yet", () => {
    // A newly created article: a cost was typed, no delivery has arrived. The
    // standard cost is what the factory knows, so it is what gets reported.
    expect(getAverageUnitCost([], 'ch', 500)).toBe(500);
  });

  it('still reports nothing when there is neither a movement nor a standard cost', () => {
    expect(getAverageUnitCost([], 'ch')).toBeNull();
  });

  it('leaves other items alone', () => {
    const movements = [
      cost({ itemId: 'ch', direction: 'IN', quantity: 10, unitCost: 100 }),
      cost({ itemId: 'tige', direction: 'IN', quantity: 10, unitCost: 900 }),
    ];
    expect(getAverageUnitCost(movements, 'ch')).toBe(100);
  });
});

describe('getBatchUnitCost', () => {
  it('prices a lot from its own deliveries, not from the item average', () => {
    const movements = [
      cost({ itemId: 'ch', batchId: 'b-1', direction: 'IN', quantity: 100, unitCost: 80 }),
      cost({ itemId: 'ch', batchId: 'b-2', direction: 'IN', quantity: 100, unitCost: 120 }),
    ];
    expect(getBatchUnitCost(movements, 'b-1')).toBe(80);
    expect(getBatchUnitCost(movements, 'b-2')).toBe(120);
    expect(getAverageUnitCost(movements, 'ch')).toBe(100);
  });
});

describe('getItemValuation', () => {
  it('values the stock on hand at the weighted average', () => {
    const movements = [
      cost({ itemId: 'ch', direction: 'IN', quantity: 100, unitCost: 200 }),
      cost({ itemId: 'ch', direction: 'IN', quantity: 900, unitCost: 100 }),
      cost({ itemId: 'ch', direction: 'OUT', quantity: 500 }),
    ];
    const quantity = getItemQuantity(movements, 'ch');
    const valuation = getItemValuation(movements, 'ch', quantity, null);
    expect(quantity).toBe(500);
    expect(valuation.averageUnitCost).toBe(110);
    expect(valuation.stockValue).toBe(55_000);
    expect(valuation.uncostedQuantity).toBe(0);
  });

  it('says how much of the history it could not price', () => {
    const movements = [
      cost({ itemId: 'ch', direction: 'IN', quantity: 100, unitCost: 50 }),
      cost({ itemId: 'ch', direction: 'IN', quantity: 40 }), // arrived before costs were tracked
    ];
    const valuation = getItemValuation(movements, 'ch', 140, null);
    expect(valuation.averageUnitCost).toBe(50);
    expect(valuation.valuedQuantity).toBe(100);
    expect(valuation.uncostedQuantity).toBe(40);
  });

  it('has no value to report when nothing was ever priced', () => {
    const valuation = getItemValuation([cost({ itemId: 'ch', direction: 'IN', quantity: 10 })], 'ch', 10, null);
    expect(valuation.averageUnitCost).toBeNull();
    expect(valuation.stockValue).toBeNull();
  });

  it("falls back to the article's standard cost before any delivery arrives", () => {
    const valuation = getItemValuation([], 'ch', 0, 500);
    expect(valuation.averageUnitCost).toBe(500);
    expect(valuation.stockValue).toBe(0);
    expect(valuation.valuedQuantity).toBe(0);
  });
});

describe('getCostSources', () => {
  const movements = [
    cost({ itemId: 'ch', direction: 'IN', quantity: 100, unitCost: 100, sourceType: 'PURCHASE', sourceRef: 'BC-2026-0001' }),
    cost({ itemId: 'ch', direction: 'IN', quantity: 50, unitCost: 120, sourceType: 'PURCHASE', sourceRef: 'BC-2026-0002' }),
    cost({ itemId: 'ch', direction: 'IN', quantity: 20, unitCost: 90, sourceType: 'MANUAL' }),
    cost({ itemId: 'ch', direction: 'OUT', quantity: 60, unitCost: 100, sourceType: 'PRODUCTION', sourceRef: 'LOT-2026-0004' }),
  ];

  it('splits the value by where the stock came from, biggest first', () => {
    const sources = getCostSources(movements, 'ch');
    expect(sources.map((s) => s.source)).toEqual(['PURCHASE', 'MANUAL']);
    expect(sources[0].quantity).toBe(150);
    expect(sources[0].value).toBe(16_000);
    expect(sources[0].averageUnitCost).toBe(106.67);
    expect(sources[0].references).toEqual(['BC-2026-0001', 'BC-2026-0002']);
    expect(sources[1].value).toBe(1_800);
  });

  it('counts entries with no source as direct receptions', () => {
    const sources = getCostSources([cost({ itemId: 'ch', direction: 'IN', quantity: 5, unitCost: 10 })], 'ch');
    expect(sources[0].source).toBe('MANUAL');
    expect(sources[0].label).toBe('Réception directe');
  });

  it('never counts a consumption as a source of value', () => {
    const sources = getCostSources(movements, 'ch');
    expect(sources.some((s) => s.source === 'PRODUCTION')).toBe(false);
  });
});
