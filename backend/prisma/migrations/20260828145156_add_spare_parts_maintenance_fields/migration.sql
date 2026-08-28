-- AlterTable
ALTER TABLE "Item" ADD COLUMN "compatibility" TEXT;
ALTER TABLE "Item" ADD COLUMN "criticality" TEXT;
ALTER TABLE "Item" ADD COLUMN "description" TEXT;
ALTER TABLE "Item" ADD COLUMN "location" TEXT;
ALTER TABLE "Item" ADD COLUMN "machine" TEXT;
ALTER TABLE "Item" ADD COLUMN "manufacturer" TEXT;

-- AlterTable
ALTER TABLE "Movement" ADD COLUMN "employee" TEXT;
ALTER TABLE "Movement" ADD COLUMN "machine" TEXT;
ALTER TABLE "Movement" ADD COLUMN "maintenanceRef" TEXT;
ALTER TABLE "Movement" ADD COLUMN "notes" TEXT;

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
    "hasDescription" BOOLEAN NOT NULL DEFAULT false,
    "hasMachineInfo" BOOLEAN NOT NULL DEFAULT false,
    "defaultUnit" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_InventoryType" ("defaultUnit", "description", "hasBatches", "hasColor", "hasExpiry", "hasSize", "id", "isProductionInput", "key", "label", "singular", "sortOrder") SELECT "defaultUnit", "description", "hasBatches", "hasColor", "hasExpiry", "hasSize", "id", "isProductionInput", "key", "label", "singular", "sortOrder" FROM "InventoryType";
DROP TABLE "InventoryType";
ALTER TABLE "new_InventoryType" RENAME TO "InventoryType";
CREATE UNIQUE INDEX "InventoryType_key_key" ON "InventoryType"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
