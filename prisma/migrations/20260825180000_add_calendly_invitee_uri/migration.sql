-- Lets the Calendly webhook find and update the exact SalesCall row for a
-- booking (idempotent retries, reschedule-in-place) instead of duplicating
-- it. Nullable with no default — no repeat of the earlier ADD COLUMN
-- non-constant-default issue, since there's nothing to backfill.

ALTER TABLE "SalesCall" ADD COLUMN "calendlyInviteeUri" TEXT;

CREATE UNIQUE INDEX "SalesCall_calendlyInviteeUri_key" ON "SalesCall"("calendlyInviteeUri");
