-- AlterTable
ALTER TABLE "Item" ADD COLUMN "color" TEXT;
ALTER TABLE "Item" ADD COLUMN "size" TEXT;

-- CreateTable
CREATE TABLE "SupplierOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "orderDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "receivedDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierOrderLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityOrdered" REAL NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" DATETIME,
    CONSTRAINT "SupplierOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SupplierOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupplierOrderLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InventoryType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "singular" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hasBatches" BOOLEAN NOT NULL DEFAULT false,
    "hasExpiry" BOOLEAN NOT NULL DEFAULT false,
    "isProductionInput" BOOLEAN NOT NULL DEFAULT false,
    "hasColor" BOOLEAN NOT NULL DEFAULT false,
    "hasSize" BOOLEAN NOT NULL DEFAULT false,
    "defaultUnit" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_InventoryType" ("defaultUnit", "description", "hasBatches", "hasExpiry", "id", "isProductionInput", "key", "label", "singular", "sortOrder") SELECT "defaultUnit", "description", "hasBatches", "hasExpiry", "id", "isProductionInput", "key", "label", "singular", "sortOrder" FROM "InventoryType";
DROP TABLE "InventoryType";
ALTER TABLE "new_InventoryType" RENAME TO "InventoryType";
CREATE UNIQUE INDEX "InventoryType_key_key" ON "InventoryType"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SupplierOrder_supplierId_idx" ON "SupplierOrder"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierOrderLine_orderId_idx" ON "SupplierOrderLine"("orderId");
