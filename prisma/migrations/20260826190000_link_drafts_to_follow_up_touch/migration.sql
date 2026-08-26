-- Link agent-drafted follow-up content to the tracked Follow-ups queue, and
-- record which SOP sequence (if any) a draft was pulled from. All nullable —
-- no backfill needed for existing rows.
ALTER TABLE "LeadDraft" ADD COLUMN "sequenceId" TEXT;
ALTER TABLE "LeadDraft" ADD COLUMN "sequenceDay" TEXT;
ALTER TABLE "LeadDraft" ADD COLUMN "followUpTouchId" TEXT;

CREATE INDEX "LeadDraft_followUpTouchId_idx" ON "LeadDraft"("followUpTouchId");
