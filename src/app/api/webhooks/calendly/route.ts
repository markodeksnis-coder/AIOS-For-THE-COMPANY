import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyCalendlySignature,
  parseQualificationAnswers,
  eventUriFrom,
  fetchCalendlyEventStartTime,
  type CalendlyInviteePayload,
} from "@/lib/calendly";
import { STAGE_DEFAULT_PROBABILITY } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    return NextResponse.json(
      { error: "CALENDLY_WEBHOOK_SIGNING_KEY isn't configured on the server yet." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("Calendly-Webhook-Signature");
  if (!verifyCalendlySignature(rawBody, signatureHeader, signingKey)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: CalendlyInviteePayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { event, payload } = body;
  const email = payload.email?.trim();

  if (event === "invitee.canceled") {
    if (email) {
      await db.lead.updateMany({
        where: { email, nextCallAt: { not: null } },
        data: { nextCallAt: null },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (event !== "invitee.created") {
    // Only subscribed to these two — anything else is a no-op, not an error.
    return NextResponse.json({ ok: true, ignored: event });
  }

  if (!email) {
    return NextResponse.json({ error: "Payload had no invitee email." }, { status: 400 });
  }

  const eventUri = eventUriFrom(payload);
  const apiToken = process.env.CALENDLY_API_TOKEN;
  const startTime =
    eventUri && apiToken ? await fetchCalendlyEventStartTime(eventUri, apiToken) : null;

  const qualification = parseQualificationAnswers(payload.questions_and_answers ?? []);
  const source = payload.tracking?.utm_source || "calendly";

  const existing = await db.lead.findFirst({ where: { email } });

  // A fresh booking always means "there's a call on the calendar, not yet
  // reconfirmed" — regardless of where the lead was in the pipeline before.
  const sharedData = {
    phone: payload.text_reminder_number ?? undefined,
    timezone: payload.timezone ?? undefined,
    nextCallAt: startTime ? new Date(startTime) : undefined,
    calendlyEventUri: eventUri ?? undefined,
    ...qualification,
  };

  if (existing) {
    await db.lead.update({
      where: { id: existing.id },
      data: {
        stage: "booked_unconfirmed",
        stageProbability: STAGE_DEFAULT_PROBABILITY.booked_unconfirmed,
        stageChangedAt: new Date(),
        ...sharedData,
      },
    });
  } else {
    await db.lead.create({
      data: {
        name: payload.name?.trim() || email,
        email,
        source,
        stage: "booked_unconfirmed",
        stageProbability: STAGE_DEFAULT_PROBABILITY.booked_unconfirmed,
        ...sharedData,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
