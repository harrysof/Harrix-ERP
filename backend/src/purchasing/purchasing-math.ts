/**
 * Pure purchasing arithmetic — no Prisma, no HTTP, like stock-math.ts and
 * production-math.ts. Unit tested in purchasing-math.spec.ts.
 *
 * Nothing here is ever stored: a PO's totals and its received-so-far figures
 * are always recomputed from its lines and receipts, for the same reason
 * stock quantity is. A stored total silently stops matching the lines the day
 * someone edits one.
 */

export const PO_STATUSES = [
  /** Being written. Editable, and invisible to the supplier. */
  'DRAFT',
  /** Sent to the supplier. */
  'SUBMITTED',
  /** Confirmed by the gérant; ready to receive against. */
  'APPROVED',
  /** Some quantity arrived, some still outstanding. Set by the system. */
  'PARTIALLY_RECEIVED',
  /** Everything ordered has arrived. Set by the system. */
  'RECEIVED',
  /** Abandoned. Anything already received stays received. */
  'CANCELLED',
] as const;

export type PoStatus = (typeof PO_STATUSES)[number];

/** Statuses whose quantities no longer count as an outstanding commitment. */
export const CLOSED_PO_STATUSES: PoStatus[] = ['RECEIVED', 'CANCELLED'];

/** A PO can only be received against once someone has approved it. */
export const RECEIVABLE_PO_STATUSES: PoStatus[] = ['APPROVED', 'PARTIALLY_RECEIVED'];

/** Only a draft is freely editable; anything further has been acted on. */
export const EDITABLE_PO_STATUSES: PoStatus[] = ['DRAFT', 'SUBMITTED'];

export interface LineLike {
  id: string;
  quantity: number;
  unitCost: number;
}

export interface ReceiptLineLike {
  purchaseOrderLineId: string;
  quantity: number;
}

/** How much of one PO line has actually arrived, across every receipt. */
export function receivedForLine(lineId: string, receiptLines: ReceiptLineLike[]): number {
  return round(receiptLines.filter((r) => r.purchaseOrderLineId === lineId).reduce((sum, r) => sum + r.quantity, 0));
}

/** Still owed on one line. Never negative — an over-delivery is not a debt. */
export function outstandingForLine(line: LineLike, receiptLines: ReceiptLineLike[]): number {
  return round(Math.max(0, line.quantity - receivedForLine(line.id, receiptLines)));
}

export interface PoTotals {
  subtotal: number;
  shipping: number;
  discount: number;
  /** The rate the buyer typed, e.g. 0.19 for 19 %. Kept alongside the amount it produced. */
  taxRate: number;
  /** Always computed, never typed — see `taxRate` below. */
  tax: number;
  total: number;
}

/**
 * Tax is entered as a rate, not an amount — the same reasoning as everything
 * else this codebase refuses to store pre-computed: a flat DZD figure drifts
 * the moment a line changes, while a rate stays correct on its own.
 *
 * The taxable base is the order's pre-tax total — subtotal plus shipping,
 * minus the discount — because shipping is normally billed on the same
 * invoice and taxed with it, and a discount reduces what is actually owed
 * before tax applies to it.
 */
export function poTotals(
  lines: LineLike[],
  extras: { shipping?: number; discount?: number; taxRate?: number } = {},
): PoTotals {
  const subtotal = round(lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0));
  const shipping = extras.shipping ?? 0;
  const discount = extras.discount ?? 0;
  const taxRate = extras.taxRate ?? 0;
  const taxableBase = subtotal + shipping - discount;
  const tax = round(taxableBase * taxRate);
  return { subtotal, shipping, discount, taxRate, tax, total: round(taxableBase + tax) };
}

/**
 * The status a PO should be in after a receipt is posted.
 *
 * Computed rather than chosen by the caller, so "partially received" can
 * never be claimed for an order that is in fact complete. A cancelled PO
 * stays cancelled.
 */
export function statusAfterReceipt(current: PoStatus, lines: LineLike[], receiptLines: ReceiptLineLike[]): PoStatus {
  if (current === 'CANCELLED') return 'CANCELLED';
  if (lines.length === 0) return current;

  const anyReceived = lines.some((l) => receivedForLine(l.id, receiptLines) > 0);
  const allReceived = lines.every((l) => receivedForLine(l.id, receiptLines) >= l.quantity);

  if (allReceived) return 'RECEIVED';
  if (anyReceived) return 'PARTIALLY_RECEIVED';
  return current;
}

/**
 * What the factory is still committed to buy: the value of everything ordered
 * but not yet delivered, on POs that are neither received nor cancelled.
 * §13's "outstanding commitments".
 */
export function outstandingCommitment(
  orders: Array<{ status: string; lines: LineLike[]; receiptLines: ReceiptLineLike[] }>,
): number {
  return round(
    orders
      .filter((po) => !CLOSED_PO_STATUSES.includes(po.status as PoStatus))
      .reduce(
        (sum, po) => sum + po.lines.reduce((s, l) => s + outstandingForLine(l, po.receiptLines) * l.unitCost, 0),
        0,
      ),
  );
}

/** Money for a factory: two decimals, and no 0.1 + 0.2 artefacts. */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}
