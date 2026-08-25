-- Adds Lead.stageChangedAt so the pipeline board can show "days in stage".
-- There's no historical record of past stage changes, so existing rows are
-- backfilled from updatedAt (the closest available proxy for "when did
-- this lead last change") rather than left at the migration's run time.

ALTER TABLE "Lead" ADD COLUMN "stageChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Lead" SET "stageChangedAt" = "updatedAt";
