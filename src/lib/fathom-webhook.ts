// The actual Fathom webhook processing logic, shared between the real HTTP
// route (src/app/api/webhooks/fathom/route.ts) and the "Fire a test event"
// button (src/lib/actions/webhooks.ts) — both call processFathomWebhook so
// a test fire exercises the exact same signature-verification, matching,
// and storage path a real delivery would, not a mocked shortcut.
//
// Every outcome — success, failure, or "nothing to do" — is logged to
// WebhookEvent so a delivery is never silently dropped. A verified event
// that matches no lead is held in UnmatchedCall instead of being discarded.

import { db } from "@/lib/db";
import {
  verifyFathomSignature,
  recordingIdFrom,
  recordingUrlFrom,
  summaryTextFrom,
  inviteesFrom,
  callDateFrom,
  callStartedAtFrom,
  transcriptTextFrom,
  type FathomInvitee,
  type FathomWebhookPayload,
} from "@/lib/fathom";
import { STAGE_DEFAULT_PROBABILITY, OPEN_STAGES } from "@/lib/crm";
import type { Lead } from "@prisma/client";

export type FathomWebhookResult = { status: number; body: Record<string, unknown> };

export async function processFathomWebhook(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  opts: { isTest?: boolean } = {}
): Promise<FathomWebhookResult> {
  const isTest = opts.isTest ?? false;

  const signingKey = process.env.FATHOM_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    await logEvent({ status: "error", message: "FATHOM_WEBHOOK_SIGNING_KEY isn't configured on the server.", isTest });
    return { status: 503, body: { error: "FATHOM_WEBHOOK_SIGNING_KEY isn't configured on the server yet." } };
  }

  if (!verifyFathomSignature(rawBody, headers, signingKey)) {
    await logEvent({ status: "invalid_signature", message: "Signature verification failed.", isTest });
    return { status: 401, body: { error: "Invalid signature." } };
  }

  let body: FathomWebhookPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    await logEvent({ status: "error", message: "Payload was not valid JSON.", isTest });
    return { status: 400, body: { error: "Invalid JSON body." } };
  }

  const eventType = typeof body.type === "string" ? body.type : null;

  // Only a recording with an external invitee is a sales call — an
  // internal team meeting or a payload we don't recognize is a no-op, not
  // an error, so Fathom never sees a retry storm over it. Still logged, so
  // "nothing happened" is visible rather than silent.
  const invitees = inviteesFrom(body);
  if (invitees.length === 0) {
    await logEvent({
      status: "ignored",
      message: "No external calendar invitee on this recording — not a sales call.",
      eventType,
      isTest,
    });
    return { status: 200, body: { ok: true, matched: false } };
  }

  const recordingId = recordingIdFrom(body);
  const recordingUrl = recordingUrlFrom(body);
  const aiSummary = summaryTextFrom(body);
  const scheduledAt = callDateFrom(body);
  const startedAt = callStartedAtFrom(body);
  const transcript = transcriptTextFrom(body);
  const primary = invitees[0];

  const matched = await matchLead(invitees);

  if (!matched) {
    const unmatchedData = {
      recordingLink: recordingUrl,
      aiSummary,
      transcript,
      scheduledAt,
      startedAt,
      attendeeEmail: primary?.email ?? null,
      attendeeName: primary?.name ?? null,
      attendeePhone: primary?.phone ?? null,
    };

    // Idempotent for unmatched deliveries too — a retry for a recording
    // that's still unmatched updates the same holding row. Fathom does
    // retry deliveries, and two near-simultaneous ones for the same
    // recording can both find no existing row and race to create() the
    // same fathomRecordingId, which is @unique — upsert makes the loser
    // of that race update the row the winner just created instead of
    // crashing on a P2002 (same fix as the Calendly webhook's equivalent
    // race — see calendly-webhook.ts's handleCreated).
    if (recordingId) {
      await db.unmatchedCall.upsert({
        where: { fathomRecordingId: recordingId },
        create: { source: "fathom", fathomRecordingId: recordingId, ...unmatchedData },
        update: unmatchedData,
      });
    } else {
      await db.unmatchedCall.create({ data: { source: "fathom", fathomRecordingId: recordingId, ...unmatchedData } });
    }

    await logEvent({
      status: "unmatched",
      message: `No lead matched ${primary?.email ?? primary?.name ?? "the attendee"} — added to Unmatched calls.`,
      eventType,
      isTest,
    });
    return { status: 200, body: { ok: true, matched: false, unmatched: true } };
  }

  const { lead, matchedVia } = matched;

  // Idempotent: a retried delivery for the same recording updates the same
  // row instead of duplicating it.
  const existingCall = recordingId ? await db.salesCall.findUnique({ where: { fathomRecordingId: recordingId } }) : null;
  // A Calendly booking may have already created a "booked" row for this
  // lead's most recent call — finish that row instead of leaving it
  // stranded and creating a second one for the same call.
  const pendingBooking = !existingCall
    ? await db.salesCall.findFirst({
        where: { leadId: lead.id, callStatus: "booked", result: null },
        orderBy: { createdAt: "desc" },
      })
    : null;

  await db.$transaction(async (tx) => {
    if (existingCall) {
      await tx.salesCall.update({
        where: { id: existingCall.id },
        data: { recordingLink: recordingUrl, aiSummary, scheduledAt, startedAt, transcript },
      });
    } else if (pendingBooking) {
      await tx.salesCall.update({
        where: { id: pendingBooking.id },
        data: {
          callStatus: "showed",
          result: null,
          recordingLink: recordingUrl,
          aiSummary,
          fathomRecordingId: recordingId,
          scheduledAt,
          startedAt,
          transcript,
        },
      });
    } else if (recordingId) {
      // Same race as the unmatched-call branch above: a retried delivery
      // can land here a second time before the first has committed, both
      // having read existingCall/pendingBooking as null — upsert on the
      // unique fathomRecordingId makes the loser update instead of
      // crashing on a P2002.
      await tx.salesCall.upsert({
        where: { fathomRecordingId: recordingId },
        create: {
          leadId: lead.id,
          scheduledAt,
          callStatus: "showed",
          result: null,
          recordingLink: recordingUrl,
          aiSummary,
          fathomRecordingId: recordingId,
          startedAt,
          transcript,
        },
        update: { recordingLink: recordingUrl, aiSummary, scheduledAt, startedAt, transcript },
      });
    } else {
      await tx.salesCall.create({
        data: {
          leadId: lead.id,
          scheduledAt,
          callStatus: "showed",
          result: null,
          recordingLink: recordingUrl,
          aiSummary,
          fathomRecordingId: recordingId,
          startedAt,
          transcript,
        },
      });
    }

    // A recording is proof the prospect showed up — advance the stage, but
    // never downgrade a lead a rep has already moved further (no-show,
    // closed) than that.
    if (OPEN_STAGES.has(lead.stage)) {
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          stage: "showed",
          stageProbability: STAGE_DEFAULT_PROBABILITY.showed,
          stageChangedAt: new Date(),
          nextCallAt: null,
        },
      });
    }
  });

  await logEvent({
    status: "processed",
    message: `Matched "${lead.name}" by ${matchedVia} — recording attached.`,
    eventType,
    isTest,
  });
  return { status: 200, body: { ok: true, matched: true, leadId: lead.id } };
}

/** Attendee email first, then phone, then name — each pass tries every
 *  invitee before falling through to the next field, since the first
 *  invitee isn't necessarily the one whose contact info actually matches
 *  (a call can have several external attendees). */
async function matchLead(invitees: FathomInvitee[]): Promise<{ lead: Lead; matchedVia: string } | null> {
  for (const invitee of invitees) {
    const email = invitee.email?.trim();
    if (!email) continue;
    const lead = await db.lead.findFirst({ where: { email } });
    if (lead) return { lead, matchedVia: "email" };
  }
  for (const invitee of invitees) {
    const phone = invitee.phone?.trim();
    if (!phone) continue;
    const lead = await db.lead.findFirst({ where: { phone } });
    if (lead) return { lead, matchedVia: "phone" };
  }
  const names = invitees.map((i) => i.name?.trim().toLowerCase()).filter((n): n is string => Boolean(n));
  if (names.length > 0) {
    const leads = await db.lead.findMany();
    const lead = leads.find((l) => names.includes(l.name.trim().toLowerCase()));
    if (lead) return { lead, matchedVia: "name" };
  }
  return null;
}

async function logEvent(input: { status: string; message: string; eventType?: string | null; isTest: boolean }) {
  try {
    await db.webhookEvent.create({
      data: {
        source: "fathom",
        eventType: input.eventType ?? null,
        status: input.status,
        message: input.message,
        isTest: input.isTest,
      },
    });
  } catch {
    // Logging itself must never be the reason a webhook fails.
  }
}
