---
title: "Setter Assistant"
type: agent
department: marketing
owner: Marko
status: active
updated: 2026-08-20
tags: [agent, marketing, assistant, live]
links: ["[[marketing-department]]", "[[sample-outbound-setter]]"]
---

# Setter Assistant

**Role type:** assistant (supports [[sample-outbound-setter]])
**Department:** Marketing
**Runtime:** Claude (`claude-opus-5`)
**Status:** active — [open the chat](/agents/setter-assistant/chat)

**Grounded in:** every `doc`-type file with `department: marketing` —
[[cold-email-follow-up]], [[cold-sms-outreach]], and anything else filed
under Marketing — plus its own department's live Issues and Projects.

**What it's for:** drafting outreach messages against the real playbooks,
and logging a follow-up as a tracked Issue so it doesn't fall through the
cracks.

**Real tools (scoped to the Marketing department only):**
- read open Issues and Projects, and the latest Scorecard numbers
- create Issues and Projects
- move an Issue or Project to a new status
- log a real Scorecard entry against a defined KPI

It always tells you plainly what it did after using a tool — nothing
happens silently.
