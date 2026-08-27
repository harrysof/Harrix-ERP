import { describe, expect, it } from "vitest";
import { orderSubtotal, orderTotal } from "./types";

describe("orderSubtotal", () => {
  it("sums quantity times unit price across lines", () => {
    const subtotal = orderSubtotal({
      lines: [
        { productItemId: "a", productName: "A", unit: "paire", quantity: 3, unitPrice: 1000 },
        { productItemId: "b", productName: "B", unit: "paire", quantity: 2, unitPrice: 500 },
      ],
    });
    expect(subtotal).toBe(4000);
  });

  it("is 0 with no lines", () => {
    expect(orderSubtotal({ lines: [] })).toBe(0);
  });
});

describe("orderTotal", () => {
  it("adds shipping and tax, subtracts discount, on top of the subtotal", () => {
    const total = orderTotal({
      lines: [{ productItemId: "a", productName: "A", unit: "paire", quantity: 1, unitPrice: 1000 }],
      shipping: 200,
      discount: 100,
      tax: 50,
    });
    expect(total).toBe(1000 + 200 - 100 + 50);
  });
});
