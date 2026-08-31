-- DropIndex
DROP INDEX "CostCategory_key_key";

-- DropIndex
DROP INDEX "CostEntry_productItemId_idx";

-- DropIndex
DROP INDEX "CostEntry_date_idx";

-- DropIndex
DROP INDEX "CostEntry_categoryId_idx";

-- DropIndex
DROP INDEX "MaterialCostOverride_month_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CostCategory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CostEntry";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "FinanceSetting";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MaterialCostOverride";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "reorderThreshold" REAL NOT NULL,
    "photoUrl" TEXT,
    "color" TEXT,
    "size" TEXT,
    "description" TEXT,
    "machine" TEXT,
    "compatibility" TEXT,
    "manufacturer" TEXT,
    "location" TEXT,
    "criticality" TEXT,
    "gender" TEXT,
    "price" REAL,
    "unitCost" REAL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Item_inventoryTypeId_fkey" FOREIGN KEY ("inventoryTypeId") REFERENCES "InventoryType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("archived", "color", "compatibility", "createdAt", "criticality", "description", "gender", "id", "inventoryTypeId", "location", "machine", "manufacturer", "name", "photoUrl", "price", "reference", "reorderThreshold", "size", "unit", "unitCost") SELECT "archived", "color", "compatibility", "createdAt", "criticality", "description", "gender", "id", "inventoryTypeId", "location", "machine", "manufacturer", "name", "photoUrl", "price", "reference", "reorderThreshold", "size", "unit", "unitCost" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE UNIQUE INDEX "Item_reference_key" ON "Item"("reference");
CREATE INDEX "Item_inventoryTypeId_idx" ON "Item"("inventoryTypeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

