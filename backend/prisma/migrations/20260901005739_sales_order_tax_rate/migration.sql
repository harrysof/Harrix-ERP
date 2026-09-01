-- Order.tax was a flat DZD amount the seller had to compute by hand.
-- Renamed to taxRate: a fraction (0.19 for 19%), same convention as
-- PurchaseOrder.taxRate — the DZD amount is now always computed from it.
ALTER TABLE "Order" RENAME COLUMN "tax" TO "taxRate";
