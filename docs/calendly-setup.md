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

## 1. Register the webhook subscription

Calendly webhooks are created via their API, not a UI button. Run this
from any terminal with `curl` (replace `YOUR_PAT` and the URL):

```bash
curl -X POST https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer YOUR_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://aios-for-the-company.vercel.app/api/webhooks/calendly",
    "events": ["invitee.created", "invitee.canceled"],
    "organization": "https://api.calendly.com/organizations/YOUR_ORG_UUID",
    "scope": "organization"
  }'
```

To find your organization UUID, run:

```bash
curl https://api.calendly.com/users/me -H "Authorization: Bearer YOUR_PAT"
```

— the response includes `current_organization`, a URL ending in your
org's UUID.

The webhook registration response includes a **`signing_key`** — copy
it, you need it in the next step. It's shown once.

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

The lead card shows five qualification fields, auto-filled from Calendly
booking-form answers by matching **keywords in the question text** (see
`src/lib/calendly.ts`, `FIELD_KEYWORDS`):

| Lead field | Question text needs to contain |
| --- | --- |
| Location | "location", "where are you", "based", or "city" |
| Instagram / LinkedIn | "instagram" or "linkedin" |
| Years running agency | "years" or "how long" |
| Monthly revenue | "revenue" |
| Sells / runs paid ads | "do you sell", "do you currently sell", "paid ads", or "run ads" |

Add these as custom questions on your Calendly event type's booking form,
using wording that includes one of the keywords above, and answers will
flow straight into the matching field. If a field comes through blank,
the question wording probably doesn't contain a matching keyword —
reword it, or extend the keyword list in `calendly.ts`.

## 4. Test it

Book a test call on your own Calendly link. Within a few seconds, a new
lead should appear on the board in the "Booked (Unconfirmed)" column
with the qualification fields filled in.
