-- CreateTable
CREATE TABLE "OrderReturn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderReturn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderReturnLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnId" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "movementId" TEXT,
    CONSTRAINT "OrderReturnLine_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "OrderReturn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderReturnLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderReturn_code_key" ON "OrderReturn"("code");

-- CreateIndex
CREATE INDEX "OrderReturn_orderId_idx" ON "OrderReturn"("orderId");

-- CreateIndex
CREATE INDEX "OrderReturnLine_returnId_idx" ON "OrderReturnLine"("returnId");

-- CreateIndex
CREATE INDEX "OrderReturnLine_orderLineId_idx" ON "OrderReturnLine"("orderLineId");
