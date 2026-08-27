-- CreateTable
CREATE TABLE "InventoryType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "singular" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hasBatches" BOOLEAN NOT NULL DEFAULT false,
    "hasExpiry" BOOLEAN NOT NULL DEFAULT false,
    "isProductionInput" BOOLEAN NOT NULL DEFAULT false,
    "defaultUnit" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "reorderThreshold" REAL NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Item_inventoryTypeId_fkey" FOREIGN KEY ("inventoryTypeId") REFERENCES "InventoryType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "receivedDate" DATETIME NOT NULL,
    "expiryDate" DATETIME,
    CONSTRAINT "Batch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT,
    "direction" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "supplierId" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Movement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Movement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Movement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryType_key_key" ON "InventoryType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Item_reference_key" ON "Item"("reference");

-- CreateIndex
CREATE INDEX "Item_inventoryTypeId_idx" ON "Item"("inventoryTypeId");

-- CreateIndex
CREATE INDEX "Batch_itemId_idx" ON "Batch"("itemId");

-- CreateIndex
CREATE INDEX "Movement_itemId_idx" ON "Movement"("itemId");

-- CreateIndex
CREATE INDEX "Movement_batchId_idx" ON "Movement"("batchId");
