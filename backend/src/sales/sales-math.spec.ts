import { describe, expect, it } from 'vitest';
import { canCancel, canEdit, canShip, lineTotal, orderTotals, summarizeCustomer, type OrderLineLike } from './sales-math.js';

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
    const totals = orderTotals([line(2, 1500), line(1, 800)], { shipping: 500, discount: 300, tax: 200 });
    expect(totals.subtotal).toBe(3800);
    expect(totals.total).toBe(3800 + 500 + 200 - 300);
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
});

describe('summarizeCustomer', () => {
  const order = (paymentStatus: string, shipmentStatus: string, total: number) => ({
    paymentStatus,
    shipmentStatus,
    lines: [line(1, total)],
    shipping: 0,
    discount: 0,
    tax: 0,
  });

  it('totals purchases and separates what is still owed — §19', () => {
    const summary = summarizeCustomer([
      order('PAID', 'SHIPPED', 1000),
      order('PENDING', 'PENDING', 400),
      order('PENDING', 'SHIPPED', 600),
    ]);
    expect(summary.orderCount).toBe(3);
    expect(summary.totalPurchased).toBe(2000);
    expect(summary.outstandingBalance).toBe(1000);
  });

  it('excludes cancelled orders from both figures', () => {
    const summary = summarizeCustomer([order('PAID', 'SHIPPED', 1000), order('CANCELLED', 'CANCELLED', 9999)]);
    expect(summary.orderCount).toBe(1);
    expect(summary.totalPurchased).toBe(1000);
  });

  it('reports zeroes for a customer with no orders', () => {
    expect(summarizeCustomer([])).toEqual({ orderCount: 0, totalPurchased: 0, outstandingBalance: 0 });
  });
});
