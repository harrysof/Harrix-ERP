import { describe, expect, it } from 'vitest';
import {
  outstandingCommitment,
  outstandingForLine,
  poTotals,
  receivedForLine,
  statusAfterReceipt,
  type LineLike,
  type ReceiptLineLike,
} from './purchasing-math.js';

const line = (id: string, quantity: number, unitCost = 10): LineLike => ({ id, quantity, unitCost });
const rl = (purchaseOrderLineId: string, quantity: number): ReceiptLineLike => ({ purchaseOrderLineId, quantity });

describe('receivedForLine', () => {
  it('sums every receipt against that line only', () => {
    expect(receivedForLine('a', [rl('a', 30), rl('a', 20), rl('b', 999)])).toBe(50);
  });

  it('is zero when nothing has arrived', () => {
    expect(receivedForLine('a', [])).toBe(0);
  });
});

describe('outstandingForLine', () => {
  it('reports what is still owed', () => {
    expect(outstandingForLine(line('a', 100), [rl('a', 40)])).toBe(60);
  });

  it('never reports a negative outstanding on an over-delivery', () => {
    expect(outstandingForLine(line('a', 100), [rl('a', 120)])).toBe(0);
  });
});

describe('poTotals', () => {
  it('computes subtotal and total from the lines', () => {
    const totals = poTotals([line('a', 10, 250), line('b', 4, 1000)], { shipping: 500, discount: 200, taxRate: 0.19 });
    expect(totals.subtotal).toBe(6500);
    // Taxable base is 6500 + 500 - 200 = 6800; tax is 19 % of that = 1292.
    expect(totals.tax).toBe(1292);
    expect(totals.total).toBe(6800 + 1292);
  });

  it('computes no tax when no rate is given', () => {
    const totals = poTotals([line('a', 1, 100)], {});
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(100);
  });

  it('handles an empty PO without NaN', () => {
    expect(poTotals([], {})).toMatchObject({ subtotal: 0, total: 0 });
  });
});

describe('statusAfterReceipt', () => {
  const lines = [line('a', 100), line('b', 50)];

  it('goes to PARTIALLY_RECEIVED when only some arrived', () => {
    expect(statusAfterReceipt('APPROVED', lines, [rl('a', 40)])).toBe('PARTIALLY_RECEIVED');
  });

  it('goes to RECEIVED only when every line is complete', () => {
    expect(statusAfterReceipt('APPROVED', lines, [rl('a', 100)])).toBe('PARTIALLY_RECEIVED');
    expect(statusAfterReceipt('APPROVED', lines, [rl('a', 100), rl('b', 50)])).toBe('RECEIVED');
  });

  it('counts an over-delivery as complete', () => {
    expect(statusAfterReceipt('APPROVED', lines, [rl('a', 200), rl('b', 50)])).toBe('RECEIVED');
  });

  it('leaves a cancelled PO cancelled whatever arrives', () => {
    expect(statusAfterReceipt('CANCELLED', lines, [rl('a', 100), rl('b', 50)])).toBe('CANCELLED');
  });

  it('leaves the status alone when nothing has arrived', () => {
    expect(statusAfterReceipt('APPROVED', lines, [])).toBe('APPROVED');
  });
});

describe('outstandingCommitment', () => {
  it('values only what is ordered and not yet delivered — §13', () => {
    const commitment = outstandingCommitment([
      { status: 'APPROVED', lines: [line('a', 100, 10)], receiptLines: [rl('a', 40)] },
      { status: 'RECEIVED', lines: [line('b', 100, 10)], receiptLines: [rl('b', 100)] },
      { status: 'CANCELLED', lines: [line('c', 100, 10)], receiptLines: [] },
    ]);
    // Only the first PO counts: 60 units still owed at 10 each.
    expect(commitment).toBe(600);
  });

  it('is zero with nothing outstanding', () => {
    expect(outstandingCommitment([])).toBe(0);
  });
});
