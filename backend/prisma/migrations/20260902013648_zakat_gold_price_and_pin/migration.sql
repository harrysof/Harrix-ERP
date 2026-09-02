-- CreateTable
CREATE TABLE "GoldPriceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pricePerGram" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ZakatCalculation" (
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
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ZakatCalculation" ("amountPaid", "bank", "calculationDate", "cash", "createdAt", "deductions", "finishedGoodsValue", "goldPricePerGram", "id", "methodology", "notes", "otherAssets", "paymentDate", "rawMaterialsValue", "receivablesValue", "updatedAt", "zakatRate") SELECT "amountPaid", "bank", "calculationDate", "cash", "createdAt", "deductions", "finishedGoodsValue", "goldPricePerGram", "id", "methodology", "notes", "otherAssets", "paymentDate", "rawMaterialsValue", "receivablesValue", "updatedAt", "zakatRate" FROM "ZakatCalculation";
DROP TABLE "ZakatCalculation";
ALTER TABLE "new_ZakatCalculation" RENAME TO "ZakatCalculation";
CREATE INDEX "ZakatCalculation_calculationDate_idx" ON "ZakatCalculation"("calculationDate");
CREATE INDEX "ZakatCalculation_pinned_idx" ON "ZakatCalculation"("pinned");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GoldPriceSnapshot_fetchedAt_idx" ON "GoldPriceSnapshot"("fetchedAt");
