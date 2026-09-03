import { describe, expect, it } from 'vitest';
import {
  canCancel,
  canEdit,
  canReturn,
  canShip,
  lineTotal,
  orderTotals,
  paymentStatusOf,
  returnableForLine,
  returnedForLine,
  summarizeCustomer,
  type OrderLineLike,
} from './sales-math.js';

const line = (quantity: number, unitPrice: number, discount = 0): OrderLineLike => ({ quantity, unitPrice, discount });

describe('lineTotal', () => {
  it('multiplies then subtracts the line discount', () => {
    expect(lineTotal(line(3, 100, 50))).toBe(250);
  });

  it('never goes negative on an over-large line discount', () => {
    expect(lineTotal(line(1, 100, 500))).toBe(0);
  });
});

describe('orderTotals', () => {
  it('computes the whole invoice from the lines — §16', () => {
    const totals = orderTotals([line(2, 1500), line(1, 800)], { shipping: 500, discount: 300, taxRate: 0.19 });
    expect(totals.subtotal).toBe(3800);
    const taxableBase = 3800 + 500 - 300;
    expect(totals.tax).toBe(Math.round(taxableBase * 0.19 * 100) / 100);
    expect(totals.total).toBe(taxableBase + totals.tax);
  });

  it('computes tax from a rate, not a typed amount', () => {
    const totals = orderTotals([line(1, 1000)], { taxRate: 0.19 });
    expect(totals.tax).toBe(190);
    expect(totals.total).toBe(1190);
  });

  it('counts line discounts in the subtotal and reports them separately', () => {
    const totals = orderTotals([line(2, 1000, 200)], {});
    expect(totals.subtotal).toBe(1800);
    expect(totals.lineDiscounts).toBe(200);
    expect(totals.total).toBe(1800);
  });

  it('clamps a discount larger than the order at zero, not below', () => {
    expect(orderTotals([line(1, 100)], { discount: 5000 }).total).toBe(0);
  });

  it('handles an empty order without NaN', () => {
    expect(orderTotals([], {})).toMatchObject({ subtotal: 0, total: 0 });
  });

  it('does not accumulate float noise', () => {
    expect(orderTotals([line(3, 0.1)], {}).total).toBe(0.3);
  });

  it('treats a missing line discount as zero', () => {
    expect(orderTotals([{ quantity: 2, unitPrice: 50 }], {}).total).toBe(100);
  });

  it('defaults to FIXED and treats discount as a DZD amount', () => {
    const totals = orderTotals([line(1, 1000)], { discount: 100 });
    expect(totals.discountType).toBe('FIXED');
    expect(totals.discount).toBe(100);
    expect(totals.discountRate).toBe(0);
    expect(totals.total).toBe(900);
  });

  it('computes a PERCENT discount from the subtotal, before shipping', () => {
    const totals = orderTotals([line(1, 1000)], { shipping: 200, discount: 0.1, discountType: 'PERCENT' });
    expect(totals.discountType).toBe('PERCENT');
    expect(totals.discountRate).toBe(0.1);
    expect(totals.discount).toBe(100);
    expect(totals.total).toBe(1100);
  });
});

describe('status rules', () => {
  it('allows shipping only a pending order, once', () => {
    expect(canShip({ shipmentStatus: 'PENDING' })).toBe(true);
    expect(canShip({ shipmentStatus: 'SHIPPED' })).toBe(false);
    expect(canShip({ shipmentStatus: 'CANCELLED' })).toBe(false);
  });

  it('locks a shipped order against editing — its lines moved real stock', () => {
    expect(canEdit({ shipmentStatus: 'PENDING' })).toBe(true);
    expect(canEdit({ shipmentStatus: 'SHIPPED' })).toBe(false);
  });

  it('refuses to cancel what already shipped or is already cancelled', () => {
    expect(canCancel({ shipmentStatus: 'PENDING' })).toBe(true);
    expect(canCancel({ shipmentStatus: 'SHIPPED' })).toBe(false);
    expect(canCancel({ shipmentStatus: 'CANCELLED' })).toBe(false);
  });

  it('only lets a shipped order accept a return — there is nothing outside to give back otherwise', () => {
    expect(canReturn({ shipmentStatus: 'PENDING' })).toBe(false);
    expect(canReturn({ shipmentStatus: 'SHIPPED' })).toBe(true);
    expect(canReturn({ shipmentStatus: 'CANCELLED' })).toBe(false);
  });
});

describe('returns', () => {
  it('sums only the lines matching this order line', () => {
    const returns = [
      { orderLineId: 'a', quantity: 2 },
      { orderLineId: 'b', quantity: 5 },
      { orderLineId: 'a', quantity: 1 },
    ];
    expect(returnedForLine('a', returns)).toBe(3);
    expect(returnedForLine('c', returns)).toBe(0);
  });

  it('caps what is still returnable at the shipped quantity, never negative', () => {
    const line = { id: 'a', quantity: 10 };
    expect(returnableForLine(line, [])).toBe(10);
    expect(returnableForLine(line, [{ orderLineId: 'a', quantity: 4 }])).toBe(6);
    expect(returnableForLine(line, [{ orderLineId: 'a', quantity: 10 }])).toBe(0);
    // An over-return (e.g. two returns racing past each other) still clamps at zero.
    expect(returnableForLine(line, [{ orderLineId: 'a', quantity: 15 }])).toBe(0);
  });
});

describe('paymentStatusOf', () => {
  it('is PENDING when nothing has been paid', () => {
    expect(paymentStatusOf(1000, 0)).toBe('PENDING');
  });

  it('is PARTIAL between nothing and the full total — the "half now, half later" case', () => {
    expect(paymentStatusOf(1000, 500)).toBe('PARTIAL');
  });

  it('is PAID once amountPaid reaches the total, and never overshoots past it', () => {
    expect(paymentStatusOf(1000, 1000)).toBe('PAID');
    expect(paymentStatusOf(1000, 1200)).toBe('PAID');
  });

  it('treats a zero-total order as already PAID', () => {
    expect(paymentStatusOf(0, 0)).toBe('PAID');
  });
});

describe('summarizeCustomer', () => {
  const order = (paymentStatus: string, shipmentStatus: string, total: number, amountPaid = 0) => ({
    paymentStatus,
    shipmentStatus,
    amountPaid,
    lines: [line(1, total)],
    shipping: 0,
    discount: 0,
    discountType: 'FIXED',
    taxRate: 0,
  });

  it('totals purchases and separates what is still owed — §19', () => {
    const summary = summarizeCustomer([
      order('PAID', 'SHIPPED', 1000, 1000),
      order('PENDING', 'PENDING', 400),
      order('PENDING', 'SHIPPED', 600),
    ]);
    expect(summary.orderCount).toBe(3);
    expect(summary.totalPurchased).toBe(2000);
    expect(summary.outstandingBalance).toBe(1000);
  });

  it('counts only the remaining balance on a PARTIAL order, not the whole thing', () => {
    const summary = summarizeCustomer([order('PARTIAL', 'SHIPPED', 1000, 400)]);
    expect(summary.totalPurchased).toBe(1000);
    expect(summary.outstandingBalance).toBe(600);
  });

  it('excludes cancelled orders from both figures', () => {
    const summary = summarizeCustomer([order('PAID', 'SHIPPED', 1000, 1000), order('CANCELLED', 'CANCELLED', 9999)]);
    expect(summary.orderCount).toBe(1);
    expect(summary.totalPurchased).toBe(1000);
  });

  it('reports zeroes for a customer with no orders', () => {
    expect(summarizeCustomer([])).toEqual({ orderCount: 0, totalPurchased: 0, outstandingBalance: 0 });
  });
});
