-- CreateTable
CREATE TABLE "OvertimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "hours" REAL NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OvertimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "position" TEXT NOT NULL,
    "hireDate" DATETIME NOT NULL,
    "birthDate" DATETIME,
    "nin" TEXT,
    "cnasNumber" TEXT,
    "contractType" TEXT NOT NULL DEFAULT 'CDI',
    "contractEndDate" DATETIME,
    "maritalStatus" TEXT,
    "dependentChildren" INTEGER NOT NULL DEFAULT 0,
    "salary" REAL NOT NULL,
    "expectedHoursPerDay" REAL NOT NULL DEFAULT 8,
    "bankRib" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Employee" ("address", "archived", "archivedAt", "bankRib", "birthDate", "cnasNumber", "contractEndDate", "contractType", "createdAt", "dependentChildren", "emergencyContactName", "emergencyContactPhone", "fullName", "hireDate", "id", "maritalStatus", "nin", "notes", "phone", "position", "salary", "updatedAt") SELECT "address", "archived", "archivedAt", "bankRib", "birthDate", "cnasNumber", "contractEndDate", "contractType", "createdAt", "dependentChildren", "emergencyContactName", "emergencyContactPhone", "fullName", "hireDate", "id", "maritalStatus", "nin", "notes", "phone", "position", "salary", "updatedAt" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE INDEX "Employee_archived_idx" ON "Employee"("archived");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OvertimeEntry_employeeId_idx" ON "OvertimeEntry"("employeeId");
