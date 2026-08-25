-- Separates Fathom's AI summary from a rep's manual call notes (used to
-- share `SalesCall.notes`, so a rep typing notes later silently overwrote
-- the summary), and adds the "never silently drop a call" backstop:
-- WebhookEvent (a log of every inbound delivery) and UnmatchedCall (a
-- verified-but-unmatched event, held for one-click assignment instead of
-- being dropped).

ALTER TABLE "SalesCall" ADD COLUMN "aiSummary" TEXT;

CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "eventType" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "UnmatchedCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "fathomRecordingId" TEXT,
    "recordingLink" TEXT,
    "aiSummary" TEXT,
    "transcript" TEXT,
    "scheduledAt" TEXT,
    "startedAt" DATETIME,
    "attendeeEmail" TEXT,
    "attendeeName" TEXT,
    "attendeePhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "WebhookEvent_source_createdAt_idx" ON "WebhookEvent"("source", "createdAt");

CREATE UNIQUE INDEX "UnmatchedCall_fathomRecordingId_key" ON "UnmatchedCall"("fathomRecordingId");

CREATE INDEX "UnmatchedCall_source_createdAt_idx" ON "UnmatchedCall"("source", "createdAt");
