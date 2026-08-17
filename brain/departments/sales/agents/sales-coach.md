---
title: "Sales Coach"
type: agent
department: sales
owner: Marko
status: active
updated: 2026-08-17
tags: [agent, sales, coach, live]
links: ["[[sales-department]]", "[[sales-fundamentals]]"]
---

The first agent in the company with a real runtime — every other agent
definition (see [[head-of-sales]]) is still just a shape. This one
actually runs.

# Sales Coach

**Role type:** coach
**Department:** Sales
**Runtime:** Claude (`claude-opus-5`)
**Status:** active — [open the chat](/agents/sales-coach/chat)

**Grounded in:** every `doc`-type file with `department: sales` — right
now that's the Sales Fundamentals curriculum ([[sales-fundamentals]]) plus
any playbooks and scripts filed under Sales. As more Sales content is
added to `/brain`, this agent picks it up automatically on its next
message — no redeploy needed.

**What it's for:** answering questions against the real training content,
role-playing discovery and objection-handling scenarios, and quizzing
reps before their first live call — grounded in what the company actually
teaches, not generic advice.

**What it isn't (yet):** it can't take actions (book calls, update
Issues, send messages) or see live company data (Issues, Projects,
Scorecards) — it only reads `/brain` docs for its own department. Tool
use is future work.
