-- Follow-up (Loom) tracking: one planned-or-sent personalized follow-up per
-- lead, covering both the today/tomorrow send queue (sentAt null) and the
-- sent/reply/watch history that feeds the Follow-ups page's metrics.

CREATE TABLE "FollowUpTouch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "loomUrl" TEXT,
    "dueAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "repliedAt" DATETIME,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER,
    "bookedFromThis" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUpTouch_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "FollowUpTouch_leadId_idx" ON "FollowUpTouch"("leadId");

CREATE INDEX "FollowUpTouch_dueAt_idx" ON "FollowUpTouch"("dueAt");

CREATE INDEX "FollowUpTouch_sentAt_idx" ON "FollowUpTouch"("sentAt");
