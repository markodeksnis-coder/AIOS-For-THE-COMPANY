-- Adds the one metric the dashboard asks for that OutreachLog had no column
-- for: how many of the DMs sent were actually opened/seen. Literal constant
-- default (not an expression) so ADD COLUMN on a NOT NULL column is legal on
-- real Turso, per the migration note in CLAUDE.md — existing rows backfill
-- to 0, which the UI renders as "—" with a "no data" badge rather than a
-- misleading 0% seen rate.
ALTER TABLE "OutreachLog" ADD COLUMN "messagesSeen" INTEGER NOT NULL DEFAULT 0;
