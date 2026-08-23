-- CreateTable
CREATE TABLE "CallDebrief" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesCallId" TEXT NOT NULL,
    "endReason" TEXT,
    "notEstablished" TEXT,
    "scriptAdherence" INTEGER,
    "weakestStep" TEXT,
    "prospectDream" TEXT,
    "prospectBlocker" TEXT,
    "commitmentScore" INTEGER,
    "finalObjection" TEXT,
    "objectionType" TEXT,
    "objectionOther" TEXT,
    "doubtMoment" TEXT,
    "replayMoment" TEXT,
    "rootCause" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CallDebrief_salesCallId_fkey" FOREIGN KEY ("salesCallId") REFERENCES "SalesCall" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CallDebrief_salesCallId_key" ON "CallDebrief"("salesCallId");

-- CreateIndex
CREATE INDEX "CallDebrief_weakestStep_idx" ON "CallDebrief"("weakestStep");

-- CreateIndex
CREATE INDEX "CallDebrief_rootCause_idx" ON "CallDebrief"("rootCause");

-- CreateIndex
CREATE INDEX "CallDebrief_createdAt_idx" ON "CallDebrief"("createdAt");

