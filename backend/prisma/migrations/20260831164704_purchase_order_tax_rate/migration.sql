/*
  Warnings:

  - You are about to drop the column `tax` on the `PurchaseOrder` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "expectedDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "shipping" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseOrder" ("code", "createdAt", "date", "discount", "expectedDate", "id", "notes", "shipping", "status", "supplierId", "updatedAt") SELECT "code", "createdAt", "date", "discount", "expectedDate", "id", "notes", "shipping", "status", "supplierId", "updatedAt" FROM "PurchaseOrder";
DROP TABLE "PurchaseOrder";
ALTER TABLE "new_PurchaseOrder" RENAME TO "PurchaseOrder";
CREATE UNIQUE INDEX "PurchaseOrder_code_key" ON "PurchaseOrder"("code");
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");
CREATE INDEX "PurchaseOrder_date_idx" ON "PurchaseOrder"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
