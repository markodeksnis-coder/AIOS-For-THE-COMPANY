// Calendly webhook signature verification and payload parsing.
//
// Calendly signs each webhook request with an HMAC-SHA256 over
// `${timestamp}.${rawBody}`, sent as `t=<timestamp>,v1=<signature>` in the
// Calendly-Webhook-Signature header. The signing key is returned once when
// the webhook subscription is created via Calendly's API — see
// docs/calendly-setup.md for the one-time setup steps.

import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;

export function verifyCalendlySignature(rawBody: string, header: string | null, signingKey: string): boolean {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k?.trim(), v?.trim()];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_SIGNATURE_AGE_SECONDS) return false;

  const expected = createHmac("sha256", signingKey).update(`${timestamp}.${rawBody}`).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

type QA = { question: string; answer: string };

/** Calendly's own question wording varies per event type, so this matches by
 *  keyword rather than exact text. If a lead's qualification fields come
 *  through blank, the Calendly question text probably doesn't contain one
 *  of these keywords — reword the question on the booking form to include
 *  it, or extend the keyword list below. */
const FIELD_KEYWORDS: { field: keyof ParsedQualification; keywords: string[] }[] = [
  { field: "sellsService", keywords: ["do you sell", "do you currently sell", "paid ads", "run ads"] },
  { field: "monthlyRevenue", keywords: ["monthly revenue", "revenue"] },
  { field: "instagramOrLinkedin", keywords: ["instagram", "linkedin"] },
  { field: "yearsRunningAgency", keywords: ["years", "how long"] },
  { field: "location", keywords: ["location", "where are you", "based", "city"] },
];

export type ParsedQualification = {
  sellsService?: string;
  monthlyRevenue?: number;
  instagramOrLinkedin?: string;
  yearsRunningAgency?: number;
  location?: string;
};

function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return cleaned && Number.isFinite(n) ? n : undefined;
}

export function parseQualificationAnswers(qa: QA[]): ParsedQualification {
  const result: ParsedQualification = {};
  for (const { question, answer } of qa) {
    if (!answer?.trim()) continue;
    const q = question.toLowerCase();
    const match = FIELD_KEYWORDS.find((f) => f.keywords.some((k) => q.includes(k)));
    if (!match) continue;
    if (match.field === "monthlyRevenue" || match.field === "yearsRunningAgency") {
      const n = parseNumber(answer);
      if (n !== undefined) result[match.field] = n;
    } else {
      result[match.field] = answer.trim();
    }
  }
  return result;
}

export type CalendlyInviteePayload = {
  event: "invitee.created" | "invitee.canceled";
  payload: {
    name?: string | null;
    email?: string | null;
    text_reminder_number?: string | null;
    timezone?: string | null;
    questions_and_answers?: QA[];
    tracking?: { utm_source?: string | null } | null;
    // Calendly's webhook payload gives the scheduled event only as a URI
    // (sometimes nested as { uri }) — the actual start time has to be
    // fetched separately via the API, see fetchCalendlyEventStartTime.
    event?: string | { uri?: string } | null;
  };
};

export function eventUriFrom(payload: CalendlyInviteePayload["payload"]): string | null {
  if (typeof payload.event === "string") return payload.event;
  if (payload.event && typeof payload.event === "object") return payload.event.uri ?? null;
  return null;
}

/** Best-effort: returns null (never throws) so a booking still creates the
 *  lead even if the token is missing/invalid or Calendly's API is down —
 *  the qualification info and contact details matter more than the exact
 *  start time, which can always be filled in by hand. */
export async function fetchCalendlyEventStartTime(eventUri: string, apiToken: string): Promise<string | null> {
  try {
    const res = await fetch(eventUri, { headers: { Authorization: `Bearer ${apiToken}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as { resource?: { start_time?: string } };
    return data.resource?.start_time ?? null;
  } catch {
    return null;
  }
}
