# Connecting Calendly to the Inside Sales CRM

Once this is set up, every Calendly booking auto-creates (or updates) a
lead in the CRM at `/sales/crm` — no manual entry. This is a one-time
setup, done by you (not Claude — it needs your own Calendly account).

## What you need

- A Calendly **Personal Access Token** (PAT): calendly.com → your profile
  photo → **Integrations** → **API & Webhooks** → **Generate New Token**.
- Your production URL, e.g. `https://aios-for-the-company.vercel.app`.

**Keep your PAT private — don't paste it into a chat with Claude or
anyone else.** You'll use it directly in a terminal on your own machine.
This isn't just caution: `api.calendly.com` is actually blocked by
Claude Code's sandbox network policy, so a Claude session genuinely
cannot run this registration for you even with the token in hand — the
commands below have to be run from your own terminal.

## 1. Register the webhook subscription

Calendly webhooks are created via their API, not a UI button, and it
requires a **Standard plan or higher** — webhook subscriptions return
"Permission Denied" on the Free plan.

First, find your organization UUID:

```bash
curl https://api.calendly.com/users/me -H "Authorization: Bearer YOUR_PAT"
```

— the response includes `current_organization`, a URL ending in your
org's UUID.

Next, **generate your own random signing key** — Calendly does not hand
you one back; you provide it to Calendly, and Calendly then uses it to
sign every webhook it sends you afterward:

```bash
openssl rand -hex 32
```

Copy that value — you need it both in the request below and in step 2.

Now register the subscription (replace `YOUR_PAT`, `YOUR_ORG_UUID`, and
`YOUR_SIGNING_KEY`):

```bash
curl -X POST https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer YOUR_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://aios-for-the-company.vercel.app/api/webhooks/calendly",
    "events": ["invitee.created", "invitee.canceled"],
    "organization": "https://api.calendly.com/organizations/YOUR_ORG_UUID",
    "scope": "organization",
    "signing_key": "YOUR_SIGNING_KEY"
  }'
```

A successful response shows `"state": "active"` — it does **not** echo
the signing key back, since you already have it from the step above.

## 2. Add the environment variables

In Vercel (Project → Settings → Environment Variables), add for
**Production and Preview**:

- `CALENDLY_WEBHOOK_SIGNING_KEY` — the `signing_key` from step 1. Without
  this, the webhook endpoint returns a clear 503 instead of accepting
  unverified requests.
- `CALENDLY_API_TOKEN` — the same PAT from step 1 (optional, but without
  it a booking's exact call time won't be filled in automatically — the
  lead still gets created, just without `nextCallAt` set).

Redeploy after adding these so the new values take effect.

## 3. Custom qualification questions

The lead card shows five qualification fields, plus phone, auto-filled
from Calendly booking-form answers by matching **keywords in the
question text** (see `src/lib/calendly.ts`, `FIELD_KEYWORDS` and
`PHONE_KEYWORDS`):

| Lead field | Question text needs to contain |
| --- | --- |
| Location | "location", "where are you", "based", or "city" |
| Instagram / LinkedIn | "instagram" or "linkedin" |
| Years running agency | "years" or "how long" |
| Monthly revenue | "monthly revenue" — deliberately not a bare "revenue", so a separate "revenue goal" question on the same form doesn't collide with it |
| Sells / runs paid ads | "do you sell", "do you currently sell", "paid ads", or "run ads" |
| Phone | "phone number", "mobile number", or "text message" — only used as a fallback; Calendly's own SMS-reminder opt-in field is tried first |

A revenue or "years" question phrased as a range (radio buttons like
"$1k - $5k /mo") is handled too — the field stores the average of the
range, not a garbled concatenation of the digits.

Add these as custom questions on your Calendly event type's booking form,
using wording that includes one of the keywords above, and answers will
flow straight into the matching field. If a field comes through blank,
the question wording probably doesn't contain a matching keyword —
reword it, or extend the keyword list in `calendly.ts`. Deal value,
company, and campaign/funnel are never auto-filled — those aren't things
Calendly's booking form collects, so they stay manual.

## 4. Test it

Book a test call on your own Calendly link. Within a few seconds, a new
lead should appear on the board in the "Booked (Unconfirmed)" column
with the qualification fields filled in.
