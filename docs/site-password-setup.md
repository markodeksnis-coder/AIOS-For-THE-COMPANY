# Setting up the site password

Company OS has no per-user login system — three routes (`/api/agents/[slug]/chat`,
`/api/leads/[id]/draft`, `/api/sales/follow-up-sweep`) call the Claude API and
write to the database with no auth of their own, and the rest of the app
(real leads, deal values, revenue numbers) was equally open to anyone with
the URL. `src/middleware.ts` gates every route behind one shared passphrase
instead — not a full multi-user login system, just a single password
checked once per browser.

**Without `SITE_PASSWORD` set, the gate does nothing** — the middleware
fails open rather than locking out a deploy that hasn't had the env var
configured yet. If the app is currently reachable with no password prompt,
this is why.

## Setup

1. Pick a passphrase (doesn't need `openssl rand` — this is typed by hand,
   not sent by a webhook caller).
2. In Vercel (Project → Settings → Environment Variables), add
   `SITE_PASSWORD` for **Production** (and Preview, if you want preview
   deployments gated the same way) with that value.
3. Redeploy so the new value takes effect.

Visiting any page redirects to `/site-login` until the right password is
entered; a cookie then remembers the browser for 180 days. The cookie
stores a hash of the password, not the password itself.

## What's exempt

`/api/webhooks/calendly`, `/api/webhooks/fathom`, and `/api/cron/daily`
are excluded from the gate — they're called by Calendly, Fathom, and
Vercel's own cron scheduler, not a browser, and each already has its own
signature/secret check (see `docs/calendly-setup.md`, `docs/fathom-setup.md`,
`docs/cron-setup.md`).
