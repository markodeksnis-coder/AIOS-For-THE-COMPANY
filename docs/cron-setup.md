# Setting up the daily agent cron

`/api/cron/daily` is what makes every active agent do its unprompted
daily check-in (an entry in each agent's Activity feed) and runs the AI
Follow-up Sweep automatically, every day, without anyone opening the app.
`vercel.json` already tells Vercel to call it once a day:

```json
{
  "crons": [
    { "path": "/api/cron/daily", "schedule": "0 13 * * *" }
  ]
}
```

That config alone is not enough for it to actually do anything —
**two separate things have to be true**, and unlike the Calendly/Fathom
integrations (which each have their own `docs/*-setup.md`), nothing
documented this until now. If nobody's ever seen a `daily_digest` entry
in an agent's Activity feed, this is the first thing to check.

## 1. `CRON_SECRET` has to be set in Vercel

The route requires it — Vercel's own cron caller automatically sends
`Authorization: Bearer $CRON_SECRET` on every scheduled invocation, and
the route checks that header before doing anything else:

```ts
const secret = process.env.CRON_SECRET;
if (!secret) return NextResponse.json({ error: "..." }, { status: 503 });
if (request.headers.get("authorization") !== `Bearer ${secret}`) {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}
```

**If `CRON_SECRET` was never added to Vercel's environment variables,
this 503 fires on every single scheduled run, before any agent check-in
or follow-up sweep code even executes.** Nothing gets written to
`AgentActivity`, no error surfaces anywhere a human would see it — it
just looks, from inside the app, exactly like the cron never ran at
all. This is the leading suspect for that symptom.

To set it up:

1. Generate a random value: `openssl rand -hex 32`.
2. In Vercel (Project → Settings → Environment Variables), add
   `CRON_SECRET` for **Production** (Preview isn't invoked by Vercel's
   cron scheduler, so Production is what matters here) with that value.
3. Redeploy so the new value takes effect.

You don't need to give this value to Claude or paste it anywhere —
Vercel's cron infrastructure attaches it to the request automatically
once it's set as an env var; nothing else needs to know it.

## 2. The project has to actually be on a plan/deployment where Vercel Cron Jobs run

Vercel Cron Jobs only fire against **Production** deployments — a
branch/Preview deployment is never invoked by the scheduler, regardless
of what's in `vercel.json`. If the only deployments so far have been
preview branches (e.g. this repo's `claude/company-aios-qr7sgx` branch),
the cron has never had a Production deployment to attach to. Check
Vercel's dashboard (Project → Settings → Cron Jobs) to confirm the job
is actually listed and enabled — that page is the source of truth for
"is this even registered," independent of `CRON_SECRET`.

## 3. How to verify it's actually running, after fixing the above

Run the **Debug webhooks** admin script (see `docs/admin-scripts.md`) —
its "Active agents" section prints when each agent last ran its
`daily_digest`. After the next scheduled run (or after manually hitting
`/api/cron/daily` with the right `Authorization: Bearer` header from
Vercel's dashboard, if it supports a manual trigger), that timestamp
should update. If it still doesn't move, the next thing to check is
Vercel's own function logs for `/api/cron/daily` — those aren't
reachable from a Claude Code session in this sandbox (see the "Debugging
a failed Vercel build" section of `CLAUDE.md` for why), so that check has
to be done by hand, in Vercel's dashboard.
