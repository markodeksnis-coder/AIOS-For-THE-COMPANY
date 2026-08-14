# Changelog

Written in plain words — this is for you, not just for other developers.

## Phase 1 — The brain, no app (2026-08-09)

Built the `/brain` folder: the actual company knowledge, as plain files,
before any app touches it.

**What's in there:**

- `company.yaml` — your offer, ICP, and a draft north star/values/promise/
  guarantee for you to correct. **The company name is a guess** ("Business
  & Fitness", pulled from your screenshots) — fix it if that's wrong.
- Five departments (Marketing, Sales, HR, Operations, Finance), each with
  a mission, draft KPIs, and a folder for docs/systems/apps/agents/
  scorecards.
- People: you (real), plus three sample hires — Customer Success Lead,
  Fulfillment Specialist, Outbound Setter — clearly marked SAMPLE so
  nobody mistakes them for real employees.
- Six "apps" entries for tools already connected in this workspace
  (Gmail, Google Drive, Google Calendar, Canva, Trello, Atlassian) —
  login owner and exact cost still need filling in.
- A placeholder training course ("Welcome to Business & Fitness") with
  three empty lessons — structure only, no real content yet.
- Three draft-v1 playbooks: cold email follow-up, cold SMS outreach, and
  an appointment-setting call script — first passes for you to correct.
- One sample project, one decision log entry explaining why we're doing
  it this way, and one meeting note capturing today's kickoff.

**What I removed:** the earlier FastAPI backend from before this pivot
(closed PR #1) — it put company knowledge inside a database-only
service instead of readable files, which broke the one rule that
matters here.

**What's next:** Phase 2 — a read-only Next.js app that lists, renders,
and searches everything in `/brain`, with backlinks. No editing yet,
just a clean way to browse what's already here.

## Phase 2 — Live reader app (2026-08-13)

The app exists now. Run `npm run dev` and open `localhost:3000` — see
`docs/how-to-run.md`.

**What's in there:**

- Real sidebar matching the reference product you sent screenshots of:
  Work / Company / Departments / The Brain groups. Anything not built
  yet is visibly greyed out with a "PHASE N" tag — nothing pretends to
  work when it doesn't.
- **Docs** — every file in `/brain` (34 total), keyword search, and a
  backlinks panel on each doc showing what links to it.
- **Teams & Members** — org roster grouped by department, read live
  from `/brain/people`.
- **Agents registry** — grouped by department, honestly labeled "not
  running" (a real agent runtime is Phase 6, not this).
- **Department pages** — mission, KPIs, team, apps, and lead agent for
  each of the 7 departments.
- **Training** — course list with a real (currently 0%) progress bar;
  per-person tracking is Phase 4.
- `npm run sync-brain` rebuilds the whole search index from `/brain` in
  under a second — the database is disposable, `/brain` is not.

**Departments changed:** added CEO and Product (your priority call),
kept Labs and Tech out for now. 7 departments total, up from 5.

**New in `/brain`:** 5 sample agent definitions (Chief Executive
Officer, Chief Marketing Officer, Setter Assistant, Head of Sales, Head
of Product) so the Agents registry isn't empty — all clearly marked
SAMPLE, same rule as everything else.

**Stack note:** Prisma 7 (the current default install) requires a new
driver-adapter setup that would have added real complexity mid-build,
so this pins Prisma 6.19.3 instead — same SQLite behavior the plan
called for, without fighting a new config system. Also: `npm audit`
flags 3 high-severity issues in build-time tooling (postcss, sharp)
that only clear on a breaking Next.js 16 upgrade — left as-is since the
plan pins Next.js 15, flagging here for visibility rather than silently
upgrading.

**What's next:** Phase 3 — Issues, Projects, Initiatives, and Inbox
with real create/edit/delete, backed by the same SQLite database.

## Live on the internet (2026-08-14)

The app is deployed to Vercel now — you have a real link you can open
from any device, not just your own computer.

**What changed under the hood:** a plain SQLite file only lives on your
own disk, so it can't be the database for a hosted app — Vercel's
servers don't keep files between requests. Switched the database to
Turso (a hosted version of the same SQLite), so the data survives and
is shared across every visit. `/brain` is still the real source of
truth; the database is still just a disposable, rebuildable index of
it — that rule didn't change, only where the index lives.

**What's next:** Phase 3 — Issues, Projects, and Inbox with real
create/edit/delete, now backed by the live hosted database.

## Phase 3 — Issues, Projects, Inbox (2026-08-14)

Real work tracking, not sample content — create, edit, comment on, and
delete Issues and Projects, and they show up live for everyone using
the link (previous phases only stored `/brain` files at build time).

**What's in there:**

- **Issues** — title, description, status (Backlog/Todo/In
  Progress/Done/Canceled), priority, department, assignee, due date,
  and an optional linked project. Status and priority can be changed
  right from the list without opening the issue. Comments on each
  issue's detail page.
- **Projects** — name, description, status, department, target date.
  Board view (grouped by status) and List view, toggle between them.
  Each project shows the issues linked to it.
- **Inbox** — "what needs you today," pulled live from Issues:
  overdue first, then what's assigned to you, then anything open and
  unassigned. No separate data entry — it's just a live view of Issues.
- Sidebar items for Inbox, Issues, and Projects are real links now
  (previously greyed out "PHASE 3" placeholders). Scorecards stays
  greyed out — that's Phase 4.

**Why these pages are "live" and Docs/Training aren't:** Issues and
Projects are real, changing-all-the-time work data, so those pages are
told to always fetch fresh from the database instead of using a
cached page from the last deploy — otherwise a newly created issue
wouldn't show up until the next build.

**What's next:** Phase 4 — Scorecards (real numbers plugged into the
KPIs already defined per department).

## Phase 4 — Scorecards (2026-08-14)

Real numbers against the KPIs every department already had defined —
"40–60 appointments booked / month" now has an actual place to log
what really happened each period, instead of just sitting there as a
target.

**What's in there:**

- **Scorecards** page, grouped by department, one card per KPI. Each
  card shows the KPI's name and target (still defined in `/brain` —
  that part didn't change), the latest logged number, a trend arrow
  against the previous entry, and a small sparkline of recent history.
- **Log entry** on any KPI card — a date, a number, and an optional
  note. Entries can be deleted if you log something wrong.
- Department pages link straight to their scorecard section.
- Sidebar's Scorecards link is real now — nothing greyed out left in
  the Work group.

**Why targets stay in `/brain` but the numbers don't:** a KPI's name
and target are a decision (rarely changes, belongs in the readable
files); the actual weekly/monthly number is a fast-changing log, the
same reasoning that put Issues and Projects in the database instead of
markdown files back in Phase 3.

**What's next:** the two remaining greyed-out sidebar items —
Systems (Phase 2 scope, never built out) and the Graph view
(visualizing how everything in `/brain` links together).
