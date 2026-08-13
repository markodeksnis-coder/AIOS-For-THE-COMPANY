---
title: "Brain README"
type: doc
department:
owner: Marko
status: active
updated: 2026-08-09
tags: [meta, rules]
links: ["[[company]]"]
---

# What this folder is

This is the company. Not a backup of it, not a summary of it — the actual
source of truth. Everything the app shows you is read out of these files.
If the app breaks or disappears, the company still exists here, readable
by anyone with a text editor.

**The rule that never breaks:** the app is a window into this folder. The
folder is never a window into the app. Never write company knowledge only
into a database — write it here first.

# Rules for editing this folder (human or AI)

1. **Every file starts with YAML frontmatter.** Required fields: `title`,
   `type`, `department`, `owner`, `status`, `updated`, `tags`, `links`.
   Leave `department` blank for company-wide files.
2. **`type` is one of:** `company`, `department`, `doc`, `system`, `agent`,
   `app`, `course`, `lesson`, `project`, `person`, `template`, `meeting`,
   `decision`, `scorecard`, `playbook`.
3. **`status` is one of:** `draft`, `active`, `archived`. Draft means "first
   pass, needs a human to check it" — most of what's in here right now is
   draft or sample.
4. **Link things.** Put related files in the `links` frontmatter field, and
   use `[[file-name]]` inline in the body when you mention another file in
   passing. Both are how the app draws backlinks and the graph view.
5. **Sample data is marked `SAMPLE` in the title or an explicit note near
   the top of the file.** Never let sample content quietly pass as real —
   it should be obvious at a glance so nobody makes a real decision off a
   placeholder.
6. **Small files, one topic each.** If a file passes ~300 lines, split it
   into two linked files rather than letting it sprawl.
7. **Don't delete history.** If a decision changes, add a new file to
   `/decisions` explaining the change rather than editing the old one away
   — the point of this folder is that you can see how the company got
   here, not just where it is now.

# Folder map

- `company.yaml` — north star, values, offer, pricing, promise, guarantee
- `departments/<name>/` — mission, KPIs, docs, SOPs, tools, agents, scorecards
- `people/` — one file per person: role, department, targets, onboarding
- `training/<course>/` — courses, modules, one file per lesson
- `projects/` — one file per project: goal, owner, status, tasks
- `contracts/` — client and vendor contracts
- `templates/` — invoices, proposals, offer docs, email templates
- `playbooks/` — outbound: cold email, cold SMS, cold calls, DMs
- `meetings/` — dated call notes and transcripts
- `decisions/` — one file per big decision, with the reasoning kept intact
