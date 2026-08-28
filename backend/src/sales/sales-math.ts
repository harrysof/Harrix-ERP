/**
 * Pure sales arithmetic. No Prisma, no HTTP. Unit tested in sales-math.spec.ts.
 *
 * §16: "The user should not have to manually calculate these totals." So no
 * total is ever stored or submitted — the API accepts lines, quantities,
 * prices and the three order-level adjustments, and every figure below is
 * derived from them on read.
 */

export const SHIPMENT_STATUSES = ['PENDING', 'SHIPPED', 'CANCELLED'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'CANCELLED'] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface OrderLineLike {
  quantity: number;
  unitPrice: number;
  /** Per-line discount in currency, applied before the order-level discount. */
  discount?: number;
}

export interface OrderTotals {
  subtotal: number;
  lineDiscounts: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
}

/** One line's contribution, after its own discount. Never below zero. */
export function lineTotal(line: OrderLineLike): number {
  return round(Math.max(0, line.quantity * line.unitPrice - (line.discount ?? 0)));
}

/**
 * §16's calculation, in one place:
 *   subtotal (after line discounts) + shipping + tax − order discount
 *
 * Clamped at zero: a discount larger than the order does not produce a
 * negative invoice the factory would have to explain.
 */
export function orderTotals(
  lines: OrderLineLike[],
  extras: { shipping?: number; discount?: number; tax?: number } = {},
): OrderTotals {
  const gross = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const lineDiscounts = round(lines.reduce((sum, l) => sum + (l.discount ?? 0), 0));
  const subtotal = round(lines.reduce((sum, l) => sum + lineTotal(l), 0));

  const shipping = extras.shipping ?? 0;
  const discount = extras.discount ?? 0;
  const tax = extras.tax ?? 0;

  return {
    subtotal,
    lineDiscounts,
    shipping,
    discount,
    tax,
    total: round(Math.max(0, subtotal + shipping + tax - discount)),
    ...(gross === 0 ? {} : {}),
  };
}

/** Shipping may only be recorded once, and never for a cancelled order. */
export function canShip(order: { shipmentStatus: string }): boolean {
  return order.shipmentStatus === 'PENDING';
}

/**
 * An order can be edited while nothing irreversible has happened to it.
 * Once it has shipped, its lines drove real stock movements and editing them
 * would make the ledger disagree with the invoice.
 */
export function canEdit(order: { shipmentStatus: string }): boolean {
  return order.shipmentStatus === 'PENDING';
}

export function canCancel(order: { shipmentStatus: string }): boolean {
  return order.shipmentStatus !== 'CANCELLED' && order.shipmentStatus !== 'SHIPPED';
}

export interface CustomerSummary {
  orderCount: number;
  totalPurchased: number;
  outstandingBalance: number;
}

/**
 * §19's customer summaries.
 *
 * - totalPurchased counts every non-cancelled order.
 * - outstandingBalance is what is still owed: orders whose payment is
 *   PENDING. There is no payments ledger (a deliberate scope call), so this
 *   is whole-order, not partial — an order is owed in full or not at all.
 */
export function summarizeCustomer(
  orders: Array<{ shipmentStatus: string; paymentStatus: string; lines: OrderLineLike[]; shipping: number; discount: number; tax: number }>,
): CustomerSummary {
  const live = orders.filter((o) => o.shipmentStatus !== 'CANCELLED' && o.paymentStatus !== 'CANCELLED');
  const totalOf = (o: (typeof live)[number]) => orderTotals(o.lines, o).total;

  return {
    orderCount: live.length,
    totalPurchased: round(live.reduce((sum, o) => sum + totalOf(o), 0)),
    outstandingBalance: round(live.filter((o) => o.paymentStatus === 'PENDING').reduce((sum, o) => sum + totalOf(o), 0)),
  };
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}
