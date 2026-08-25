-- Adds Lead.stageChangedAt so the pipeline board can show "days in stage".
-- There's no historical record of past stage changes, so existing rows are
-- backfilled from updatedAt (the closest available proxy for "when did
-- this lead last change") rather than left at the migration's run time.
--
-- SQLite disallows a non-constant default (CURRENT_TIMESTAMP) on
-- ALTER TABLE ... ADD COLUMN for a NOT NULL column — it's fine in
-- CREATE TABLE, but not here. Real Turso enforces this even though the
-- local libsql file driver used for `prisma migrate deploy` didn't catch
-- it. A literal constant default satisfies NOT NULL for the ADD COLUMN
-- itself; the UPDATE right after replaces it with the real backfill value.

ALTER TABLE "Lead" ADD COLUMN "stageChangedAt" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';

UPDATE "Lead" SET "stageChangedAt" = "updatedAt";
