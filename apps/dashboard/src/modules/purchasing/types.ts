import type { DiscountType, PoLineInput } from "../../lib/purchasingApi";

/** One editable line in the purchase-order form. */
export interface PoLineDraft {
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitCost: number;
}

export const emptyPoLine = (): PoLineDraft => ({ itemId: "", itemName: "", unit: "", quantity: 0, unitCost: 0 });

export function toLineInput(line: PoLineDraft): PoLineInput {
  return { itemId: line.itemId, quantity: line.quantity, unitCost: line.unitCost };
}

/**
 * The same arithmetic the backend applies, used only to show a live total
 * while the user is still typing. The saved figures always come back from the
 * server — this never becomes the source of truth.
 *
 * Tax is a rate (0.19 for 19 %), not an amount: the user only ever types the
 * percentage, and the DZD figure is derived here exactly as it is on the
 * server (see purchasing-math.ts's poTotals). The order-level discount is
 * either a DZD amount (FIXED) or a fraction applied to the subtotal
 * (PERCENT), same choice as everywhere else.
 */
export function draftTotals(
  lines: PoLineDraft[],
  extras: { shipping: number; discount: number; discountType: DiscountType; taxRate: number },
) {
  const subtotal = round(lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0));
  const discountRate = extras.discountType === "PERCENT" ? extras.discount : 0;
  const discount = extras.discountType === "PERCENT" ? round(subtotal * discountRate) : extras.discount;
  const taxableBase = subtotal + extras.shipping - discount;
  const tax = round(taxableBase * extras.taxRate);
  return {
    subtotal,
    shipping: extras.shipping,
    discount,
    discountType: extras.discountType,
    discountRate,
    taxRate: extras.taxRate,
    tax,
    total: round(taxableBase + tax),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
