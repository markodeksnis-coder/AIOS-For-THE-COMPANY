-- Replaces SalesCall's single `outcome` enum with two independent axes:
-- callStatus (did they show up) and result (the sales disposition, only
-- meaningful once callStatus is "showed"). Existing rows are backfilled
-- from their old outcome value rather than defaulted, so no real call
-- history is silently lost:
--   no_show          -> callStatus=no_show,  result=NULL
--   booked_2nd_call  -> callStatus=showed,   result=follow_up
--   pif              -> callStatus=showed,   result=closed_won
--   plan             -> callStatus=showed,   result=closed_won
--   no_money         -> callStatus=showed,   result=closed_lost
--   not_a_fit        -> callStatus=showed,   result=not_qualified
--   canceled         -> callStatus=cancelled, result=NULL
--   completed        -> callStatus=showed,   result=NULL (Fathom's old "pending disposition" placeholder)

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_SalesCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "scheduledAt" TEXT NOT NULL,
    "rep" TEXT,
    "recordingLink" TEXT,
    "planLength" TEXT,
    "lossReason" TEXT,
    "cashCollected" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "callStatus" TEXT NOT NULL DEFAULT 'booked',
    "result" TEXT,
    "fathomRecordingId" TEXT,
    "transcript" TEXT,
    "startedAt" DATETIME,
    CONSTRAINT "SalesCall_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_SalesCall" (
    "id", "leadId", "scheduledAt", "rep", "recordingLink", "planLength", "lossReason",
    "cashCollected", "notes", "createdAt", "callStatus", "result",
    "fathomRecordingId", "transcript", "startedAt"
)
SELECT
    "id", "leadId", "scheduledAt", "rep", "recordingLink", "planLength", "lossReason",
    "cashCollected", "notes", "createdAt",
    CASE "outcome"
        WHEN 'no_show' THEN 'no_show'
        WHEN 'canceled' THEN 'cancelled'
        ELSE 'showed'
    END,
    CASE "outcome"
        WHEN 'booked_2nd_call' THEN 'follow_up'
        WHEN 'pif' THEN 'closed_won'
        WHEN 'plan' THEN 'closed_won'
        WHEN 'no_money' THEN 'closed_lost'
        WHEN 'not_a_fit' THEN 'not_qualified'
        ELSE NULL
    END,
    "fathomRecordingId", "transcript", "startedAt"
FROM "SalesCall";

DROP TABLE "SalesCall";
ALTER TABLE "new_SalesCall" RENAME TO "SalesCall";

CREATE UNIQUE INDEX "SalesCall_fathomRecordingId_key" ON "SalesCall"("fathomRecordingId");
CREATE INDEX "SalesCall_leadId_idx" ON "SalesCall"("leadId");
CREATE INDEX "SalesCall_callStatus_idx" ON "SalesCall"("callStatus");
CREATE INDEX "SalesCall_scheduledAt_idx" ON "SalesCall"("scheduledAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
