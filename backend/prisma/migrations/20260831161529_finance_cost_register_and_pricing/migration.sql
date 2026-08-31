-- AlterTable
ALTER TABLE "Item" ADD COLUMN "targetMargin" REAL;

-- CreateTable
CREATE TABLE "CostCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "nature" TEXT NOT NULL,
    "behavior" TEXT NOT NULL,
    "isMaterials" BOOLEAN NOT NULL DEFAULT false,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CostEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "productItemId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CostEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CostCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CostEntry_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaterialCostOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FinanceSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "defaultMargin" REAL NOT NULL DEFAULT 0.25,
    "allocationBasis" TEXT NOT NULL DEFAULT 'UNITS',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CostCategory_key_key" ON "CostCategory"("key");

-- CreateIndex
CREATE INDEX "CostEntry_categoryId_idx" ON "CostEntry"("categoryId");

-- CreateIndex
CREATE INDEX "CostEntry_date_idx" ON "CostEntry"("date");

-- CreateIndex
CREATE INDEX "CostEntry_productItemId_idx" ON "CostEntry"("productItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCostOverride_month_key" ON "MaterialCostOverride"("month");
