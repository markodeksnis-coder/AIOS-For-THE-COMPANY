// The actual Calendly webhook processing logic, kept separate from the
// HTTP route the same way Fathom's is (src/lib/fathom-webhook.ts) — one
// implementation, logged the same way, into the same WebhookEvent table
// Fathom's does.
//
// Calendly has no "rescheduled" event type: a reschedule is delivered as
// invitee.canceled (the old booking) + invitee.created (the new one,
// carrying old_invitee — the URI of the booking it replaces). The created
// handler uses that to update the existing SalesCall row in place instead
// of creating a second one.

import { db } from "@/lib/db";
import {
  verifyCalendlySignature,
  parseQualificationAnswers,
  phoneFromAnswers,
  eventUriFrom,
  oldInviteeUriFrom,
  fetchCalendlyEventStartTime,
  type CalendlyInviteePayload,
} from "@/lib/calendly";
import { STAGE_DEFAULT_PROBABILITY } from "@/lib/crm";

export type CalendlyWebhookResult = { status: number; body: Record<string, unknown> };

export async function processCalendlyWebhook(rawBody: string, signatureHeader: string | null): Promise<CalendlyWebhookResult> {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    await logEvent({ status: "error", message: "CALENDLY_WEBHOOK_SIGNING_KEY isn't configured on the server." });
    return { status: 503, body: { error: "CALENDLY_WEBHOOK_SIGNING_KEY isn't configured on the server yet." } };
  }

  if (!verifyCalendlySignature(rawBody, signatureHeader, signingKey)) {
    await logEvent({ status: "invalid_signature", message: "Signature verification failed." });
    return { status: 401, body: { error: "Invalid signature." } };
  }

  let body: CalendlyInviteePayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    await logEvent({ status: "error", message: "Payload was not valid JSON." });
    return { status: 400, body: { error: "Invalid JSON body." } };
  }

  const { event, payload } = body;

  if (event === "invitee.canceled") return handleCanceled(payload, event);
  if (event === "invitee.created") return handleCreated(payload, event);

  // Only subscribed to the two events above — anything else is a no-op,
  // not an error, but still logged so it's visible rather than silent.
  await logEvent({ status: "ignored", message: `Event type "${event}" is not one this endpoint handles.`, eventType: event });
  return { status: 200, body: { ok: true, ignored: event } };
}

async function handleCanceled(payload: CalendlyInviteePayload["payload"], eventType: string): Promise<CalendlyWebhookResult> {
  const inviteeUri = payload.uri ?? null;
  const email = payload.email?.trim() ?? null;

  let cancelledCall = false;
  if (inviteeUri) {
    const existing = await db.salesCall.findUnique({ where: { calendlyInviteeUri: inviteeUri } });
    if (existing) {
      await db.salesCall.update({ where: { id: existing.id }, data: { callStatus: "cancelled" } });
      cancelledCall = true;
    }
  }
  if (email) {
    await db.lead.updateMany({ where: { email, nextCallAt: { not: null } }, data: { nextCallAt: null } });
  }

  // A cancel that's really the "old half" of a reschedule gets overwritten
  // back to "booked" a moment later by the matching invitee.created (via
  // old_invitee) regardless of delivery order — so it's safe to always
  // mark it cancelled here without trying to detect that case specially.
  await logEvent({
    status: "processed",
    message: cancelledCall
      ? `Cancelled the call for ${email ?? "an attendee"}.`
      : `Cancellation for ${email ?? "an attendee"} — no matching call found to cancel.`,
    eventType,
  });
  return { status: 200, body: { ok: true, cancelled: cancelledCall } };
}

async function handleCreated(payload: CalendlyInviteePayload["payload"], eventType: string): Promise<CalendlyWebhookResult> {
  const email = payload.email?.trim();
  if (!email) {
    await logEvent({ status: "error", message: "Booking payload had no invitee email.", eventType });
    return { status: 400, body: { error: "Payload had no invitee email." } };
  }

  const inviteeUri = payload.uri ?? null;
  const oldInviteeUri = oldInviteeUriFrom(payload);
  const eventUri = eventUriFrom(payload);
  const apiToken = process.env.CALENDLY_API_TOKEN;
  const startTime = eventUri && apiToken ? await fetchCalendlyEventStartTime(eventUri, apiToken) : null;
  // Best-effort: fall back to "now" (rather than leaving it unset) when the
  // exact time can't be fetched, same as Fathom's date fallback — a rep can
  // always correct it by hand, but the row shouldn't be missing a date.
  const startedAt = startTime ? new Date(startTime) : new Date();
  const scheduledAt = startedAt.toISOString().slice(0, 10);

  const qualification = parseQualificationAnswers(payload.questions_and_answers ?? []);
  const source = payload.tracking?.utm_source || "calendly";

  const existingLead = await db.lead.findFirst({ where: { email } });

  // A fresh booking always means "there's a call on the calendar, not yet
  // reconfirmed" — regardless of where the lead was in the pipeline before.
  const sharedLeadData = {
    // Calendly's own SMS-reminder opt-in field first; a custom "phone
    // number" question on the booking form (what most event types
    // actually use) as the fallback.
    phone: payload.text_reminder_number ?? phoneFromAnswers(payload.questions_and_answers ?? []) ?? undefined,
    timezone: payload.timezone ?? undefined,
    nextCallAt: startTime ? new Date(startTime) : undefined,
    calendlyEventUri: eventUri ?? undefined,
    ...qualification,
  };

  const lead = existingLead
    ? await db.lead.update({
        where: { id: existingLead.id },
        data: {
          stage: "booked_unconfirmed",
          stageProbability: STAGE_DEFAULT_PROBABILITY.booked_unconfirmed,
          stageChangedAt: new Date(),
          ...sharedLeadData,
        },
      })
    : await db.lead.create({
        data: {
          name: payload.name?.trim() || email,
          email,
          source,
          stage: "booked_unconfirmed",
          stageProbability: STAGE_DEFAULT_PROBABILITY.booked_unconfirmed,
          ...sharedLeadData,
        },
      });

  // Idempotent retry: this exact invitee already has a call row.
  let existingCall = inviteeUri ? await db.salesCall.findUnique({ where: { calendlyInviteeUri: inviteeUri } }) : null;
  // Reschedule: the OLD invitee's row becomes this one, rather than a new row.
  let isReschedule = false;
  if (!existingCall && oldInviteeUri) {
    existingCall = await db.salesCall.findUnique({ where: { calendlyInviteeUri: oldInviteeUri } });
    isReschedule = Boolean(existingCall);
  }

  if (existingCall) {
    await db.salesCall.update({
      where: { id: existingCall.id },
      data: { leadId: lead.id, calendlyInviteeUri: inviteeUri, scheduledAt, startedAt, callStatus: "booked", result: null },
    });
  } else {
    await db.salesCall.create({
      data: { leadId: lead.id, calendlyInviteeUri: inviteeUri, scheduledAt, startedAt, callStatus: "booked", result: null },
    });
  }

  await logEvent({
    status: "processed",
    message: isReschedule
      ? `Rescheduled "${lead.name}"'s call to ${scheduledAt}.`
      : `Booked a call for "${lead.name}" (${existingLead ? "existing lead" : "new lead"}).`,
    eventType,
  });
  return { status: 200, body: { ok: true, leadId: lead.id } };
}

async function logEvent(input: { status: string; message: string; eventType?: string | null }) {
  try {
    await db.webhookEvent.create({
      data: { source: "calendly", eventType: input.eventType ?? null, status: input.status, message: input.message, isTest: false },
    });
  } catch {
    // Logging itself must never be the reason a webhook fails.
  }
}
