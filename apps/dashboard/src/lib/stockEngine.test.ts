import { describe, expect, it } from "vitest";
import type { Batch, Movement } from "./types";
import {
  getBatchesWithRemaining,
  getExpiryStatus,
  getFifoBatch,
  getItemQuantity,
  isLowStock,
} from "./stockEngine";

function mv(partial: Partial<Movement> & Pick<Movement, "itemId" | "direction" | "quantity">): Movement {
  return {
    id: Math.random().toString(36),
    batchId: null,
    date: "2026-01-01",
    supplierName: null,
    reason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("getItemQuantity", () => {
  it("sums in minus out for the given item only", () => {
    const movements: Movement[] = [
      mv({ itemId: "a", direction: "in", quantity: 40 }),
      mv({ itemId: "a", direction: "out", quantity: 15 }),
      mv({ itemId: "b", direction: "in", quantity: 1000 }), // must not leak into item a's total
    ];
    expect(getItemQuantity(movements, "a")).toBe(25);
  });

  it("returns 0 for an item with no movements", () => {
    expect(getItemQuantity([], "unknown")).toBe(0);
  });
});

describe("isLowStock", () => {
  it("flags stock at or below the threshold", () => {
    expect(isLowStock(10, 10)).toBe(true);
    expect(isLowStock(9, 10)).toBe(true);
    expect(isLowStock(11, 10)).toBe(false);
  });
});

describe("getExpiryStatus", () => {
  const today = "2026-06-15";

  it("has no status when there is no expiry date", () => {
    expect(getExpiryStatus(null, today)).toBe("none");
  });

  it("is expired once the date has passed", () => {
    expect(getExpiryStatus("2026-06-14", today)).toBe("expired");
  });

  it("warns inside the warning window", () => {
    expect(getExpiryStatus("2026-06-20", today, 30)).toBe("warning");
    expect(getExpiryStatus("2026-07-15", today, 30)).toBe("warning"); // exactly 30 days out
  });

  it("is ok beyond the warning window", () => {
    expect(getExpiryStatus("2026-08-01", today, 30)).toBe("ok");
  });
});

describe("getBatchesWithRemaining + getFifoBatch", () => {
  const batches: Batch[] = [
    { id: "b-new", itemId: "item-1", batchNumber: "NEW", receivedDate: "2026-02-01", expiryDate: null },
    { id: "b-old", itemId: "item-1", batchNumber: "OLD", receivedDate: "2026-01-01", expiryDate: null },
  ];

  it("orders batches oldest-received first regardless of input order", () => {
    const movements: Movement[] = [
      mv({ itemId: "item-1", batchId: "b-new", direction: "in", quantity: 10 }),
      mv({ itemId: "item-1", batchId: "b-old", direction: "in", quantity: 10 }),
    ];
    const result = getBatchesWithRemaining(batches, movements, "item-1", "2026-03-01");
    expect(result.map((b) => b.id)).toEqual(["b-old", "b-new"]);
  });

  it("picks the oldest batch that still has stock, skipping exhausted ones", () => {
    const movements: Movement[] = [
      mv({ itemId: "item-1", batchId: "b-old", direction: "in", quantity: 10 }),
      mv({ itemId: "item-1", batchId: "b-old", direction: "out", quantity: 10 }), // fully used
      mv({ itemId: "item-1", batchId: "b-new", direction: "in", quantity: 5 }),
    ];
    const withRemaining = getBatchesWithRemaining(batches, movements, "item-1", "2026-03-01");
    const fifo = getFifoBatch(withRemaining);
    expect(fifo?.id).toBe("b-new");
    expect(fifo?.remaining).toBe(5);
  });

  it("returns null when every batch is exhausted", () => {
    const movements: Movement[] = [
      mv({ itemId: "item-1", batchId: "b-old", direction: "in", quantity: 4 }),
      mv({ itemId: "item-1", batchId: "b-old", direction: "out", quantity: 4 }),
    ];
    const withRemaining = getBatchesWithRemaining(batches, movements, "item-1", "2026-03-01");
    expect(getFifoBatch(withRemaining)).toBeNull();
  });
});
