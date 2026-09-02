-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "shipmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "shipping" REAL NOT NULL DEFAULT 0,
    "discountType" TEXT NOT NULL DEFAULT 'FIXED',
    "discount" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "shipToName" TEXT,
    "shipToPhone" TEXT,
    "shipToEmail" TEXT,
    "shipToAddress" TEXT,
    "shipToCity" TEXT,
    "shipToProvince" TEXT,
    "shipToCountry" TEXT,
    "shipToPostalCode" TEXT,
    "shippedAt" DATETIME,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("code", "createdAt", "customerId", "date", "discount", "discountType", "id", "notes", "paymentStatus", "shipToAddress", "shipToCity", "shipToCountry", "shipToEmail", "shipToName", "shipToPhone", "shipToPostalCode", "shipToProvince", "shipmentStatus", "shippedAt", "shipping", "taxRate", "updatedAt") SELECT "code", "createdAt", "customerId", "date", "discount", "discountType", "id", "notes", "paymentStatus", "shipToAddress", "shipToCity", "shipToCountry", "shipToEmail", "shipToName", "shipToPhone", "shipToPostalCode", "shipToProvince", "shipmentStatus", "shippedAt", "shipping", "taxRate", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_shipmentStatus_idx" ON "Order"("shipmentStatus");
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX "Order_date_idx" ON "Order"("date");
CREATE INDEX "Order_archived_idx" ON "Order"("archived");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
