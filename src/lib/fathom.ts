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

/** The signing half of verifyFathomSignature — builds real, valid webhook
 *  headers for a payload using the actual configured signing key. Used
 *  only by the "Fire a test event" button, so that feature exercises the
 *  exact same signature-verification code path a real Fathom delivery
 *  would hit, not a mocked bypass. */
export function signFathomPayload(
  rawBody: string,
  signingKey: string
): { id: string; timestamp: string; signature: string } {
  const id = `test_${Date.now()}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const key = Buffer.from(signingKey.replace(/^whsec_/, ""), "base64");
  const signature = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  return { id, timestamp, signature: `v1,${signature}` };
}

export type FathomInvitee = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  is_external?: boolean | null;
};

type FathomTranscriptSegment = { speaker?: string | null; speaker_name?: string | null; text?: string | null };

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
  transcript?: string | FathomTranscriptSegment[] | null;
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

/** Every calendar invitee except whoever recorded the call (the rep) — one
 *  of these is the prospect. Original casing/formatting is preserved for
 *  the Lead lookups; only the recorded-by exclusion and de-dupe compare
 *  case-insensitively. */
export function inviteesFrom(payload: FathomWebhookPayload): FathomInvitee[] {
  const recordedByEmail = payload.recorded_by?.email?.trim().toLowerCase() ?? null;
  const invitees = Array.isArray(payload.calendar_invitees) ? payload.calendar_invitees : [];
  const seen = new Set<string>();
  const result: FathomInvitee[] = [];
  for (const invitee of invitees) {
    const email = invitee?.email?.trim() || null;
    const key = email?.toLowerCase() ?? `name:${invitee?.name?.trim().toLowerCase() ?? ""}`;
    if ((email && key === recordedByEmail) || seen.has(key)) continue;
    seen.add(key);
    result.push(invitee);
  }
  return result;
}

/** Convenience wrapper over inviteesFrom for callers that only need emails. */
export function inviteeEmailsFrom(payload: FathomWebhookPayload): string[] {
  return inviteesFrom(payload)
    .map((i) => i.email?.trim())
    .filter((e): e is string => Boolean(e));
}

/** YYYY-MM-DD, matching SalesCall.scheduledAt's format. Falls back to today
 *  if Fathom's timestamp fields are missing or unparseable — a call that's
 *  otherwise correctly matched and logged shouldn't be dropped over this. */
export function callDateFrom(payload: FathomWebhookPayload): string {
  const iso = payload.recording_start_time ?? payload.scheduled_start_time;
  const d = iso ? new Date(iso) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

/** The exact start time as a Date, for SalesCall.startedAt — lets the Sales
 *  Coach agent disambiguate same-day calls ("yesterday's 2pm call") since
 *  callDateFrom/scheduledAt only carries the date. Null (not "now") when
 *  Fathom didn't send a usable timestamp, so a bad row is visibly
 *  unresolved rather than silently wrong. */
export function callStartedAtFrom(payload: FathomWebhookPayload): Date | null {
  const iso = payload.recording_start_time ?? payload.scheduled_start_time;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The full call transcript as plain, readable text — "Speaker: line"
 *  per line when Fathom sends structured segments, or the raw string
 *  as-is when it doesn't. Null when there's nothing usable, never throws
 *  (transcript field shape was never confirmed live — see file header). */
export function transcriptTextFrom(payload: FathomWebhookPayload): string | null {
  const t = payload.transcript;
  if (!t) return null;
  if (typeof t === "string") return t.trim() || null;
  if (!Array.isArray(t)) return null;

  const lines = t
    .map((segment) => {
      const speaker = segment?.speaker_name ?? segment?.speaker ?? null;
      const text = segment?.text?.trim();
      if (!text) return null;
      return speaker ? `${speaker}: ${text}` : text;
    })
    .filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.join("\n") : null;
}
