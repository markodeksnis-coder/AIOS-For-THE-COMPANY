// Fathom webhook signature verification and payload parsing.
//
// Fathom signs webhooks using the open "Standard Webhooks" scheme: headers
// `webhook-id`, `webhook-timestamp`, `webhook-signature`, HMAC-SHA256 over
// `${id}.${timestamp}.${rawBody}`. The signing secret is returned once as
// `whsec_...` when the webhook is created — strip that prefix and
// base64-decode the remainder to get the raw HMAC key. The signature header
// carries one or more space-separated `v1,<base64>` values; a match against
// any one of them is enough (Fathom's docs list this for future-proofing
// key rotation). See docs/fathom-setup.md for the one-time setup steps.

import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;

export function verifyFathomSignature(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  signingKey: string
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_SIGNATURE_AGE_SECONDS) return false;

  let key: Buffer;
  let expectedBuf: Buffer;
  try {
    key = Buffer.from(signingKey.replace(/^whsec_/, ""), "base64");
    expectedBuf = Buffer.from(
      createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64"),
      "base64"
    );
  } catch {
    return false;
  }

  return signature.split(" ").some((candidate) => {
    const sig = candidate.includes(",") ? candidate.slice(candidate.indexOf(",") + 1) : candidate;
    let actualBuf: Buffer;
    try {
      actualBuf = Buffer.from(sig, "base64");
    } catch {
      return false;
    }
    return actualBuf.length === expectedBuf.length && timingSafeEqual(actualBuf, expectedBuf);
  });
}

export type FathomInvitee = { name?: string | null; email?: string | null; is_external?: boolean | null };

// Fathom's exact webhook field names couldn't be confirmed live (see
// docs/fathom-setup.md — developers.fathom.ai is blocked from this
// sandbox same as api.calendly.com), so every field here is read
// defensively with a documented fallback rather than assumed exact.
export type FathomWebhookPayload = {
  type?: string | null;
  recording_id?: number | string | null;
  id?: number | string | null;
  url?: string | null;
  share_url?: string | null;
  recording_start_time?: string | null;
  scheduled_start_time?: string | null;
  calendar_invitees?: FathomInvitee[] | null;
  recorded_by?: { email?: string | null } | null;
  default_summary?: { markdown_formatted?: string | null; text?: string | null } | string | null;
  summary?: string | null;
};

export function recordingIdFrom(payload: FathomWebhookPayload): string | null {
  const id = payload.recording_id ?? payload.id;
  return id === null || id === undefined ? null : String(id);
}

export function recordingUrlFrom(payload: FathomWebhookPayload): string | null {
  return payload.url ?? payload.share_url ?? null;
}

export function summaryTextFrom(payload: FathomWebhookPayload): string | null {
  const s = payload.default_summary ?? payload.summary;
  if (!s) return null;
  if (typeof s === "string") return s;
  return s.markdown_formatted ?? s.text ?? null;
}

/** Every calendar invitee's email except whoever recorded the call (the
 *  rep) — one of these is the prospect. Original casing is preserved for
 *  the Lead.email lookup; only the recorded-by exclusion and de-dupe
 *  compare case-insensitively. */
export function inviteeEmailsFrom(payload: FathomWebhookPayload): string[] {
  const recordedByEmail = payload.recorded_by?.email?.trim().toLowerCase() ?? null;
  const invitees = Array.isArray(payload.calendar_invitees) ? payload.calendar_invitees : [];
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const invitee of invitees) {
    const email = invitee?.email?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (key === recordedByEmail || seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }
  return emails;
}

/** YYYY-MM-DD, matching SalesCall.scheduledAt's format. Falls back to today
 *  if Fathom's timestamp fields are missing or unparseable — a call that's
 *  otherwise correctly matched and logged shouldn't be dropped over this. */
export function callDateFrom(payload: FathomWebhookPayload): string {
  const iso = payload.recording_start_time ?? payload.scheduled_start_time;
  const d = iso ? new Date(iso) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}
