/*
  Warnings:

  - You are about to drop the `HotLeadPrediction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "HotLeadPrediction_createdAt_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HotLeadPrediction";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "timezone" TEXT,
    "source" TEXT,
    "funnel" TEXT,
    "productInterest" TEXT,
    "targetPrice" REAL,
    "repName" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'new_lead',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "dealValue" REAL,
    "stageProbability" REAL,
    "lossReason" TEXT,
    "cashCollected" REAL NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Lead" ("cashCollected", "createdAt", "email", "id", "name", "notes", "order", "phone", "source", "stage", "tags", "updatedAt") SELECT "cashCollected", "createdAt", "email", "id", "name", "notes", "order", "phone", "source", "stage", "tags", "updatedAt" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_stage_idx" ON "Lead"("stage");
CREATE INDEX "Lead_source_idx" ON "Lead"("source");
CREATE TABLE "new_SalesCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "scheduledAt" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'no_show',
    "rep" TEXT,
    "recordingLink" TEXT,
    "planLength" TEXT,
    "lossReason" TEXT,
    "cashCollected" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesCall_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SalesCall" ("cashCollected", "createdAt", "id", "leadId", "notes", "outcome", "scheduledAt") SELECT "cashCollected", "createdAt", "id", "leadId", "notes", "outcome", "scheduledAt" FROM "SalesCall";
DROP TABLE "SalesCall";
ALTER TABLE "new_SalesCall" RENAME TO "SalesCall";
CREATE INDEX "SalesCall_leadId_idx" ON "SalesCall"("leadId");
CREATE INDEX "SalesCall_outcome_idx" ON "SalesCall"("outcome");
CREATE INDEX "SalesCall_scheduledAt_idx" ON "SalesCall"("scheduledAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
