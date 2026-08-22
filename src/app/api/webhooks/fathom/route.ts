import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyFathomSignature,
  recordingIdFrom,
  recordingUrlFrom,
  summaryTextFrom,
  inviteeEmailsFrom,
  callDateFrom,
  type FathomWebhookPayload,
} from "@/lib/fathom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPEN_STAGES = new Set(["new_lead", "booked_unconfirmed", "confirmed"]);

export async function POST(request: NextRequest) {
  const signingKey = process.env.FATHOM_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    return NextResponse.json(
      { error: "FATHOM_WEBHOOK_SIGNING_KEY isn't configured on the server yet." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const verified = verifyFathomSignature(
    rawBody,
    {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    },
    signingKey
  );
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: FathomWebhookPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Only a completed recording with an external invitee is a sales call —
  // an internal team meeting or a payload we don't recognize is a no-op,
  // not an error, so Fathom never sees a retry storm over it.
  const emails = inviteeEmailsFrom(body);
  if (emails.length === 0) {
    return NextResponse.json({ ok: true, matched: false });
  }

  const lead = await findLeadByEmails(emails);
  if (!lead) {
    return NextResponse.json({ ok: true, matched: false });
  }

  const recordingId = recordingIdFrom(body);
  const recordingUrl = recordingUrlFrom(body);
  const summary = summaryTextFrom(body);
  const scheduledAt = callDateFrom(body);

  // Idempotent: a retried delivery for the same recording updates the same
  // row instead of duplicating it.
  const existingCall = recordingId
    ? await db.salesCall.findUnique({ where: { fathomRecordingId: recordingId } })
    : null;

  await db.$transaction(async (tx) => {
    if (existingCall) {
      await tx.salesCall.update({
        where: { id: existingCall.id },
        data: { recordingLink: recordingUrl, notes: summary, scheduledAt },
      });
    } else {
      await tx.salesCall.create({
        data: {
          leadId: lead.id,
          scheduledAt,
          outcome: "completed",
          recordingLink: recordingUrl,
          notes: summary,
          fathomRecordingId: recordingId,
        },
      });
    }

    // A recording is proof the prospect showed up — advance the stage, but
    // never downgrade a lead a rep has already moved further (no-show,
    // closed) than that.
    if (OPEN_STAGES.has(lead.stage)) {
      await tx.lead.update({ where: { id: lead.id }, data: { stage: "showed", nextCallAt: null } });
    }
  });

  return NextResponse.json({ ok: true, matched: true });
}

async function findLeadByEmails(emails: string[]) {
  for (const email of emails) {
    const lead = await db.lead.findFirst({ where: { email } });
    if (lead) return lead;
  }
  return null;
}
