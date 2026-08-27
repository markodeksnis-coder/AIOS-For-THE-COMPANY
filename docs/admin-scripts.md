# Admin scripts (GitHub Actions, manual dispatch only)

A handful of one-off diagnostic and admin tools live in `scripts/` and
are each wired to a matching workflow in `.github/workflows/` so they
can be run against the real production database without needing local
DB credentials. None of these run automatically — every one is
`workflow_dispatch` only, triggered from the **Actions** tab on GitHub
(pick the workflow → **Run workflow**) or via the GitHub API/MCP tools.

Two are strictly **read-only** and safe to run any time:

- **Debug webhooks** (`scripts/debug-webhooks.ts`) — dumps recent
  webhook activity (Calendly/Fathom), unmatched calls, leads, follow-up
  touches, open Issues, and — per agent — when it last ran its daily
  check-in. The first thing to run when "why isn't X showing up" comes
  up.
- **Backlog review** (`scripts/backlog-review.ts`) — prints the full
  title + description (not just the title) for every open Issue, so a
  real backlog item can be acted on with full context instead of a
  guess from the title alone.

Two **write** to the database and take inputs — read the diagnostic
output above first, and know exactly what you're changing before
running these:

- **Resolve issue** (`scripts/resolve-issue.ts`) — marks one Issue
  `done` and leaves a comment explaining why. Inputs: `issue_id` (the
  exact id, not the title — get it from Backlog review's output),
  `resolution_comment`.
- **Create issue** (`scripts/create-issue.ts`) — files a new Issue.
  Inputs: `title`, `description` (required); `priority` /
  `department` / `assignee` / `due_date` (optional).
- **Set lead email** (`scripts/set-lead-email.ts`) — backfills a Lead's
  email when it's missing from the CRM but a human has it from
  somewhere Claude can't reach directly (Calendly's API is blocked
  from this sandbox — see the "Calendly's API is also blocked" section
  of `CLAUDE.md`). Inputs: `lead_name` (exact, case-insensitive) or
  `lead_id` (required if the name matches more than one lead — get it
  from Debug webhooks or Backlog review's output), `email`.
- **Log outreach** (`scripts/log-outreach.ts`) — logs the daily
  outreach numbers `/dashboard` shows (DMs sent, positive replies,
  messages sent, Skool members joined) — none of which any integration
  tracks automatically. Fed by the daily Slack check-in Routine.
  Inputs (all optional; only the ones given get logged): `date`
  (`YYYY-MM-DD`, defaults to today), `dms_sent`, `positive_replies`,
  `messages_sent`, `skool_members_joined`. Upserts by
  department="outreach" + kpiName + date, so re-running for the same
  day corrects the existing row instead of duplicating it.

All six require the same `DATABASE_URL` / `TURSO_AUTH_TOKEN` repo
secrets as `build-check.yml` (Settings → Secrets and variables →
Actions) — already configured if CI is green.
