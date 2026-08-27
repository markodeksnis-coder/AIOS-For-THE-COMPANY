-- Lead.email had no unique constraint. A real production duplicate exists
-- because of case sensitivity — the Calendly webhook (and every hand-typed
-- form) matched/stored email as-is, so "Josh.Kennedy@gmail.com" and
-- "josh.kennedy@gmail.com" were treated as two different people. The app
-- code now lowercases email on every write path; this migration cleans up
-- existing data to match before the constraint below can be added.
--
-- Merge strategy: for each group of leads sharing the same email
-- case-insensitively, keep the most recently created one (ties broken by
-- id, for determinism) as the survivor. Re-point every child row (calls,
-- follow-up touches, agent-drafted follow-ups) from the older duplicate(s)
-- onto the survivor, then delete the older duplicate(s). No fields on the
-- survivor Lead itself are touched — only its relations gain the losers'
-- history.

CREATE TEMP TABLE _lead_dupe_groups AS
  SELECT LOWER(email) AS email_key
  FROM Lead
  WHERE email IS NOT NULL
  GROUP BY LOWER(email)
  HAVING COUNT(*) > 1;

CREATE TEMP TABLE _lead_dupe_survivors AS
  SELECT
    g.email_key,
    (
      SELECT l.id FROM Lead l
      WHERE LOWER(l.email) = g.email_key
      ORDER BY l.createdAt DESC, l.id ASC
      LIMIT 1
    ) AS survivor_id
  FROM _lead_dupe_groups g;

UPDATE SalesCall
SET leadId = (
  SELECT s.survivor_id FROM _lead_dupe_survivors s
  JOIN Lead l ON LOWER(l.email) = s.email_key
  WHERE l.id = SalesCall.leadId
)
WHERE leadId IN (
  SELECT l.id FROM Lead l
  JOIN _lead_dupe_survivors s ON LOWER(l.email) = s.email_key
  WHERE l.id != s.survivor_id
);

UPDATE FollowUpTouch
SET leadId = (
  SELECT s.survivor_id FROM _lead_dupe_survivors s
  JOIN Lead l ON LOWER(l.email) = s.email_key
  WHERE l.id = FollowUpTouch.leadId
)
WHERE leadId IN (
  SELECT l.id FROM Lead l
  JOIN _lead_dupe_survivors s ON LOWER(l.email) = s.email_key
  WHERE l.id != s.survivor_id
);

UPDATE LeadDraft
SET leadId = (
  SELECT s.survivor_id FROM _lead_dupe_survivors s
  JOIN Lead l ON LOWER(l.email) = s.email_key
  WHERE l.id = LeadDraft.leadId
)
WHERE leadId IN (
  SELECT l.id FROM Lead l
  JOIN _lead_dupe_survivors s ON LOWER(l.email) = s.email_key
  WHERE l.id != s.survivor_id
);

DELETE FROM Lead
WHERE id IN (
  SELECT l.id FROM Lead l
  JOIN _lead_dupe_survivors s ON LOWER(l.email) = s.email_key
  WHERE l.id != s.survivor_id
);

DROP TABLE _lead_dupe_survivors;
DROP TABLE _lead_dupe_groups;

-- Normalize casing on every remaining email so the unique index below is
-- actually case-insensitive-equivalent going forward (app code already
-- lowercases on write; this catches whatever predates that change).
UPDATE Lead SET email = LOWER(email) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");
