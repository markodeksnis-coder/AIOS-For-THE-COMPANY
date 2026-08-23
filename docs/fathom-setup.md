# Connecting Fathom to the Inside Sales CRM

Once this is set up, every Fathom recording of a sales call auto-attaches
its recording link and AI summary to the matching lead, and moves that
lead to **Showed** — proof they actually attended, feeding the show-rate
metric on the dashboard automatically. This is a one-time setup, done by
you (not Claude — it needs your own Fathom account).

## What you need

- A Fathom **API key**: fathom.video → Settings → **API & Webhooks** →
  **Add API Connection** → **Generate API Key** ("For personal workflows
  or internal systems" — not "Create Public App", which is for OAuth apps
  other Fathom users install).
- Your production URL, e.g. `https://aios-for-the-company.vercel.app`.

**Keep your API key private — don't paste it into a chat with Claude or
anyone else.** You'll use it directly in a terminal on your own machine.
This isn't just caution: `developers.fathom.ai` and `fathom.video` are
actually blocked by Claude Code's sandbox network policy, so a Claude
session genuinely cannot run this registration for you even with the key
in hand — the command below has to be run from your own terminal.

Note that this integration only needs the **webhook signing secret**
(step 2 below), not the API key itself, at runtime — nothing in the app
calls Fathom's API. The API key is only used once, in the command below,
to *create* the webhook.

## 1. Register the webhook

```bash
curl -X POST https://api.fathom.ai/external/v1/webhooks \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "destination_url": "https://aios-for-the-company.vercel.app/api/webhooks/fathom",
    "triggered_for": ["my_recordings"],
    "include_summary": true,
    "include_transcript": true
  }'
```

The response includes a **`secret`** field (starts with `whsec_`) — copy
it, you need it in the next step. It's shown once.

If your recordings are shared with a team rather than recorded by you
directly, use `"triggered_for": ["my_shared_with_team_recordings"]`
instead — check the response/dashboard to confirm which one actually
fires for your calls.

**If you already registered this webhook before `include_transcript` was
added:** an existing webhook won't retroactively start sending transcripts
just because this doc changed. There's no confirmed update endpoint for an
existing webhook, so the reliable path is to delete the old one from the
Fathom dashboard and re-run the command above to create a fresh one — it'll
return a new `secret`, so you'll need to update
`FATHOM_WEBHOOK_SIGNING_KEY` in Vercel again too.

## 2. Add the environment variable

In Vercel (Project → Settings → Environment Variables), add for
**Production and Preview**:

- `FATHOM_WEBHOOK_SIGNING_KEY` — the `secret` from step 1. Without this,
  the webhook endpoint returns a clear 503 instead of accepting
  unverified requests.

Redeploy after adding this so the new value takes effect.

## 3. How matching works

The webhook payload lists every calendar invitee on the call. The
endpoint matches whichever invitee **isn't** the recorder (you) against
`Lead.email`, exact match. If nobody on the call matches a lead's email —
an internal meeting, a call with someone not yet in the CRM — the webhook
is a silent no-op, not an error.

On a match:

- The recording link and AI summary are saved to a new call-log entry
  (visible in the lead's Call History).
- If the lead was anywhere before "Showed" in the pipeline, it moves to
  **Showed** and its `nextCallAt` is cleared.
- That call-log entry sits as "Completed (Pending Disposition)" until you
  log the real outcome (paid in full, payment plan, no-show, etc.) from
  the lead's page — the recording link and summary are already pre-filled
  in that form, so you're just picking what happened, not re-typing
  anything.

## 4. Test it

Record a call on your own Fathom account with an invitee whose email
matches an existing lead. Once Fathom finishes processing the recording
(a couple minutes after the call ends), that lead should show "Showed"
with a new "Completed (Pending Disposition)" entry in its call history.

## A note on field names

Fathom's exact webhook payload structure couldn't be verified against
live traffic while building this — `developers.fathom.ai` is blocked from
Claude's sandbox the same way `api.calendly.com` is (see CLAUDE.md). The
parsing in `src/lib/fathom.ts` was built from Fathom's public API
reference and is deliberately defensive (multiple fallback field names,
never throws on an unexpected shape), but if a real recording doesn't
show up on the right lead, the first thing to check is the actual
payload Fathom sent — Fathom's dashboard shows recent webhook delivery
attempts and their response codes, which is the fastest way to see the
real field names and adjust `src/lib/fathom.ts` to match.
