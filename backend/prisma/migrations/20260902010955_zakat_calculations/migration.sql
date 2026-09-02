-- CreateTable
CREATE TABLE "ZakatCalculation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calculationDate" DATETIME NOT NULL,
    "methodology" TEXT NOT NULL DEFAULT 'LUNAR',
    "goldPricePerGram" REAL NOT NULL,
    "cash" REAL NOT NULL DEFAULT 0,
    "bank" REAL NOT NULL DEFAULT 0,
    "finishedGoodsValue" REAL NOT NULL DEFAULT 0,
    "rawMaterialsValue" REAL NOT NULL DEFAULT 0,
    "receivablesValue" REAL NOT NULL DEFAULT 0,
    "otherAssets" REAL NOT NULL DEFAULT 0,
    "deductions" REAL NOT NULL DEFAULT 0,
    "zakatRate" REAL NOT NULL DEFAULT 0.025,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "paymentDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ZakatCalculation_calculationDate_idx" ON "ZakatCalculation"("calculationDate");
