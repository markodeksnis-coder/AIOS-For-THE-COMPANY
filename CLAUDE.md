# Notes for Claude working on this repo

## Debugging a failed Vercel build

Vercel's build logs are not reachable from Claude's sandboxed network —
`vercel.com` and `api.vercel.com` are blocked by policy, and GitHub's API
does not carry Vercel's build log either (only a pass/fail status).

Don't ask the user to paste a Vercel log screenshot as the first move.
Instead, use `.github/workflows/build-check.yml`: it runs the exact same
steps Vercel runs (`npm run build`, which chains `migrate-turso` →
`sync-brain` → `next build`) against the real database, on every push.
Its logs **are** readable directly:

```
mcp__github__actions_run_trigger  method: rerun_workflow_run
mcp__github__get_job_logs         job_id: <id>, return_content: true
```

This turned out to be essential, not optional — a real production bug
(`scripts/migrate-turso.ts` recovering from a partially-applied migration)
and a real environment bug (a corrupted `TURSO_AUTH_TOKEN` secret, below)
were only diagnosable this way after Vercel's own log access dead-ended
twice.

Requires two repo secrets (Settings → Secrets and variables → Actions),
same values as Vercel's Environment Variables: `DATABASE_URL`,
`TURSO_AUTH_TOKEN`.

## GitHub secret gotcha: update a secret and it may corrupt silently

Observed twice in this repo: using GitHub's **"Update"** flow on an
*existing* Actions secret (not creating a fresh one) produced a value with
a stray invisible character mixed in — surfaced as
`TypeError: Cannot convert argument to a ByteString because the character
at index 15 has a value of 8226` (8226 = "•") when the corrupted value was
later used as an HTTP header (e.g. `Authorization: Bearer <token>`). This
reproduced with two different real token values pasted via two different
copy methods, so the pasted content itself wasn't the problem — something
about GitHub's own "Update" path was.

**If a secret-dependent build fails with a ByteString/header-encoding
error like that, don't assume the pasted value is wrong.** Have the user
**delete the secret and create it fresh** (not update it) — that resolved
it both times.

## Marko's nightly / weekly review protocol

When Marko types **"nightly"** in a Claude Code session on this repo:
ask exactly these three questions, **one at a time**, waiting for his
answer before asking the next:

1. What actually got finished today?
2. What did not, and what was in the way?
3. What is the one thing for tomorrow?

Then save his three answers as `reviews/nightly/YYYY-MM-DD.md` (today's
date, plain text — the three answers, no extra commentary added), commit
and push it to this branch so it survives past this session, and **say
nothing else** — no summary, no acknowledgment, no "got it."

When Marko types **"weekly"**: read every file in `reviews/nightly/`
dated within the last 7 days and give him, directly, no framing:

- The pattern in what keeps blocking him, in **one sentence**, said
  plainly — even if it's uncomfortable. Don't soften it.
- What he finished, grouped by area/theme.
- The three things to change next week, ranked by impact.

No pep talk. Be honest, not encouraging. If a week has no entries or
too few to see a pattern, say that plainly instead of forcing an
answer.

## Live deployment

Production and Preview on Vercel share the *same* Turso database
(`DATABASE_URL`/`TURSO_AUTH_TOKEN` are scoped to "Production and Preview"
in Vercel's env vars) — there is no separate branch database for previews.
Keep that in mind before assuming a Preview-only failure is a Preview-only
data problem; it's touching the same live data Production uses.
