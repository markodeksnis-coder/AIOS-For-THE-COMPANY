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
