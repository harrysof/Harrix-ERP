-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "productItemId" TEXT NOT NULL,
    "machine" TEXT NOT NULL,
    "supervisor" TEXT,
    "operator" TEXT,
    "shift" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "expectedQuantity" REAL NOT NULL,
    "firstChoice" REAL NOT NULL DEFAULT 0,
    "secondChoice" REAL NOT NULL DEFAULT 0,
    "waste" REAL NOT NULL DEFAULT 0,
    "outputDeclared" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "varianceNote" TEXT,
    "notes" TEXT,
    "outputMovementId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductionBatch_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionConsumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productionBatchId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "stockBatchId" TEXT,
    "quantity" REAL NOT NULL,
    "movementId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductionConsumption_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "ProductionBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductionConsumption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductionConsumption_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "Batch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_code_key" ON "ProductionBatch"("code");

-- CreateIndex
CREATE INDEX "ProductionBatch_productItemId_idx" ON "ProductionBatch"("productItemId");

-- CreateIndex
CREATE INDEX "ProductionBatch_date_idx" ON "ProductionBatch"("date");

-- CreateIndex
CREATE INDEX "ProductionBatch_status_idx" ON "ProductionBatch"("status");

-- CreateIndex
CREATE INDEX "ProductionConsumption_productionBatchId_idx" ON "ProductionConsumption"("productionBatchId");

-- CreateIndex
CREATE INDEX "ProductionConsumption_itemId_idx" ON "ProductionConsumption"("itemId");
