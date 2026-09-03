/*
  Warnings:

  - You are about to drop the column `registration` on the `Supplier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "ai" TEXT;
ALTER TABLE "Customer" ADD COLUMN "nif" TEXT;
ALTER TABLE "Customer" ADD COLUMN "nis" TEXT;
ALTER TABLE "Customer" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "Customer" ADD COLUMN "rc" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN "invoiceFileName" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN "invoiceFileUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "nif" TEXT,
    "rc" TEXT,
    "ai" TEXT,
    "nis" TEXT,
    "photoUrl" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Supplier" ("address", "archived", "contactName", "createdAt", "email", "id", "name", "notes", "phone") SELECT "address", "archived", "contactName", "createdAt", "email", "id", "name", "notes", "phone" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
