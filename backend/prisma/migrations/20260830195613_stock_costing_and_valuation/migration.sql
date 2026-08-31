-- AlterTable
ALTER TABLE "Item" ADD COLUMN "unitCost" REAL;

-- AlterTable
ALTER TABLE "Movement" ADD COLUMN "sourceRef" TEXT;
ALTER TABLE "Movement" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "Movement" ADD COLUMN "unitCost" REAL;

-- AlterTable
ALTER TABLE "ProductionConsumption" ADD COLUMN "unitCost" REAL;

-- AlterTable
ALTER TABLE "SupplierOrderLine" ADD COLUMN "unitCost" REAL;
