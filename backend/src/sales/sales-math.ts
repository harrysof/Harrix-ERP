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
/** FIXED: `discount` is a DZD amount. PERCENT: it's a fraction, like taxRate. */
export const DISCOUNT_TYPES = ['FIXED', 'PERCENT'] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

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
  /** Always computed, in DZD — see `discountType`/`discountRate` below. */
  discount: number;
  /** FIXED or PERCENT, mirrored from the order. */
  discountType: DiscountType;
  /** The fraction the seller typed when discountType is PERCENT, e.g. 0.10 for 10 %. Zero for FIXED. */
  discountRate: number;
  /** The rate the seller typed, e.g. 0.19 for 19 %. Kept alongside the amount it produced. */
  taxRate: number;
  /** Always computed, never typed — see `taxRate` above. */
  tax: number;
  total: number;
}

/** One line's contribution, after its own discount. Never below zero. */
export function lineTotal(line: OrderLineLike): number {
  return round(Math.max(0, line.quantity * line.unitPrice - (line.discount ?? 0)));
}

/**
 * §16's calculation, in one place:
 *   subtotal (after line discounts) + shipping − order discount, then tax
 *
 * Tax is entered as a rate, not a DZD amount — same reasoning as
 * PurchaseOrder.taxRate: a flat figure drifts the moment a line, the shipping
 * or the discount changes, while a rate stays correct on its own. The
 * taxable base is pre-tax revenue: subtotal plus shipping, minus the
 * discount.
 *
 * The order-level discount itself has the same two-shape choice as everywhere
 * else in this file: FIXED is a DZD amount taken as-is, PERCENT is a fraction
 * applied to the subtotal (before shipping — shipping isn't goods, so a
 * commercial discount doesn't eat into it).
 *
 * Clamped at zero: a discount larger than the order does not produce a
 * negative invoice the factory would have to explain.
 */
export function orderTotals(
  lines: OrderLineLike[],
  extras: { shipping?: number; discount?: number; discountType?: string; taxRate?: number } = {},
): OrderTotals {
  const lineDiscounts = round(lines.reduce((sum, l) => sum + (l.discount ?? 0), 0));
  const subtotal = round(lines.reduce((sum, l) => sum + lineTotal(l), 0));

  const shipping = extras.shipping ?? 0;
  const discountType: DiscountType = extras.discountType === 'PERCENT' ? 'PERCENT' : 'FIXED';
  const discountRate = discountType === 'PERCENT' ? (extras.discount ?? 0) : 0;
  const discount = discountType === 'PERCENT' ? round(subtotal * discountRate) : (extras.discount ?? 0);
  const taxRate = extras.taxRate ?? 0;
  const taxableBase = subtotal + shipping - discount;
  const tax = round(taxableBase * taxRate);

  return {
    subtotal,
    lineDiscounts,
    shipping,
    discount,
    discountType,
    discountRate,
    taxRate,
    tax,
    total: round(Math.max(0, taxableBase + tax)),
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

/** Only a shipped order has stock on the outside to give back. */
export function canReturn(order: { shipmentStatus: string }): boolean {
  return order.shipmentStatus === 'SHIPPED';
}

export interface ReturnLineLike {
  orderLineId: string;
  quantity: number;
}

/** How much of one order line has already come back, across every return. */
export function returnedForLine(lineId: string, returnLines: ReturnLineLike[]): number {
  return round(returnLines.filter((r) => r.orderLineId === lineId).reduce((sum, r) => sum + r.quantity, 0));
}

/** Still returnable on one shipped line. Never negative — an over-return is not owed twice. */
export function returnableForLine(line: { id: string; quantity: number }, returnLines: ReturnLineLike[]): number {
  return round(Math.max(0, line.quantity - returnedForLine(line.id, returnLines)));
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
  orders: Array<{
    shipmentStatus: string;
    paymentStatus: string;
    lines: OrderLineLike[];
    shipping: number;
    discount: number;
    discountType: string;
    taxRate: number;
  }>,
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
