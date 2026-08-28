import type { PoLineInput } from "../../lib/purchasingApi";

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
 */
export function draftTotals(lines: PoLineDraft[], extras: { shipping: number; discount: number; tax: number }) {
  const subtotal = round(lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0));
  return {
    subtotal,
    ...extras,
    total: round(subtotal + extras.shipping + extras.tax - extras.discount),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
