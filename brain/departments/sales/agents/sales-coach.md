---
title: "Sales Coach"
type: agent
department: sales
owner: Marko
status: active
updated: 2026-08-20
tags: [agent, sales, coach, live]
links: ["[[sales-department]]", "[[imperium-acquisition]]", "[[alex-hormozi]]"]
---

The first agent in the company with a real runtime — [[head-of-sales]]
and the rest of the department leads followed shortly after.

# Sales Coach

**Role type:** coach
**Department:** Sales
**Runtime:** Claude (`claude-opus-5`)
**Status:** active — [open the chat](/agents/sales-coach/chat)

**Grounded in:** every `doc`-type file with `department: sales` — right
now that's the [[imperium-acquisition]] curriculum, the (currently
placeholder) [[alex-hormozi]] curriculum, plus any playbooks and scripts
filed under Sales. As more Sales content is added to `/brain`, this agent
picks it up automatically on its next message — no redeploy needed.

**What it's for:** answering questions against the real training content,
role-playing discovery and objection-handling scenarios, and quizzing
reps before their first live call — grounded in what the company actually
teaches, not generic advice.

**Real tools (scoped to the Sales department only):** it can read open
Issues and Projects and the latest Scorecard numbers, create Issues and
Projects, move either to a new status, and log a real Scorecard entry —
so a role-play insight or a coaching note can become tracked work, not
just talk. It always says plainly what it did after using a tool.

**What it isn't (yet):** it can't book calls or send messages — those
integrations don't exist yet.
