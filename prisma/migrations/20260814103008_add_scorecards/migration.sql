-- CreateTable
CREATE TABLE "ScorecardEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "department" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ScorecardEntry_department_kpiName_idx" ON "ScorecardEntry"("department", "kpiName");
