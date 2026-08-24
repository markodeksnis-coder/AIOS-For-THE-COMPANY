"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  LEAD_STAGES,
  CALL_STATUSES,
  CALL_RESULTS,
  CALL_STATUS_TO_STAGE,
  CALL_RESULT_TO_STAGE,
  RESULT_LOSS_REASON,
  STAGE_DEFAULT_PROBABILITY,
  type LeadStage,
  type CallStatus,
  type CallResult,
} from "@/lib/crm";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function num(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// productInterest, targetPrice, repName, stageProbability, sellsService,
// and tags are deliberately NOT read from the form here — they're either
// redundant with dealValue's $3k default, auto-derived from the lead's
// stage (stageProbability), or meant to arrive from the Calendly
// questionnaire/booking history rather than be hand-typed (sellsService,
// tags). Leaving them out of this shared parser means a plain "Save" on
// the edit form never overwrites whatever those columns actually hold.
function leadFieldsFromForm(formData: FormData) {
  const nextCallAtRaw = str(formData, "nextCallAt");
  return {
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    company: str(formData, "company"),
    timezone: str(formData, "timezone"),
    source: str(formData, "source"),
    funnel: str(formData, "funnel"),
    notes: str(formData, "notes"),
    dealValue: num(formData, "dealValue"),
    location: str(formData, "location"),
    instagramOrLinkedin: str(formData, "instagramOrLinkedin"),
    yearsRunningAgency: num(formData, "yearsRunningAgency"),
    monthlyRevenue: num(formData, "monthlyRevenue"),
    nextCallAt: nextCallAtRaw ? new Date(nextCallAtRaw) : null,
  };
}

export async function createLead(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");
  const stage = (str(formData, "stage") ?? "new_lead") as LeadStage;

  const lead = await db.lead.create({
    data: { name, stage, stageProbability: STAGE_DEFAULT_PROBABILITY[stage], ...leadFieldsFromForm(formData) },
  });

  revalidatePath("/sales/crm");
  redirect(`/sales/crm/${lead.id}`);
}

export async function updateLead(id: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await db.lead.update({ where: { id }, data: { name, ...leadFieldsFromForm(formData) } });

  revalidatePath("/sales/crm");
  revalidatePath(`/sales/crm/${id}`);
}

export async function setLeadStage(id: string, stage: string) {
  if (!LEAD_STAGES.includes(stage as never)) throw new Error(`Invalid stage: ${stage}`);
  await db.lead.update({ where: { id }, data: { stage, stageProbability: STAGE_DEFAULT_PROBABILITY[stage as LeadStage] } });
  revalidatePath("/sales/crm");
  revalidatePath(`/sales/crm/${id}`);
}

/** Marks a call confirmed ahead of time — a state change, not a call outcome. */
export async function confirmLead(id: string) {
  await db.lead.update({
    where: { id },
    data: { stage: "confirmed", stageProbability: STAGE_DEFAULT_PROBABILITY.confirmed },
  });
  revalidatePath("/sales/crm");
  revalidatePath(`/sales/crm/${id}`);
}

/** Persists a drag-and-drop move on the CRM board. */
export async function moveLead(movedId: string, stage: string, columnOrder: string[]) {
  if (!LEAD_STAGES.includes(stage as never)) throw new Error(`Invalid stage: ${stage}`);
  await db.$transaction([
    db.lead.update({
      where: { id: movedId },
      data: { stage, stageProbability: STAGE_DEFAULT_PROBABILITY[stage as LeadStage] },
    }),
    ...columnOrder.map((id, index) => db.lead.update({ where: { id }, data: { order: index } })),
  ]);
  revalidatePath("/sales/crm");
}

/** Bare-minimum lead creation for the inline "+ Create as new lead" option
 *  in the search-as-you-type lead picker — just a name, so adding someone
 *  never means leaving what you're doing. Everything else gets filled in
 *  later from the lead's own page. */
export async function createLeadQuick(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");
  const stage: LeadStage = "new_lead";
  const lead = await db.lead.create({
    data: { name: trimmed, stage, stageProbability: STAGE_DEFAULT_PROBABILITY[stage] },
  });
  revalidatePath("/sales/crm");
  revalidatePath("/sales/crm/leads");
  return { id: lead.id, name: lead.name };
}

export type CsvLeadRow = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  notes: string | null;
};

/** Bulk-creates leads from an already column-mapped CSV, skipping any row
 *  whose email or phone matches an existing lead — checked against the DB
 *  and against earlier rows in the same file, so duplicates within the
 *  upload itself are caught too. */
export async function importLeadsCsv(rows: CsvLeadRow[]) {
  const existing = await db.lead.findMany({ select: { email: true, phone: true } });
  const existingEmails = new Set(existing.map((l) => l.email?.trim().toLowerCase()).filter((v): v is string => Boolean(v)));
  const existingPhones = new Set(existing.map((l) => l.phone?.trim()).filter((v): v is string => Boolean(v)));
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) {
      skipped++;
      continue;
    }
    const email = row.email?.trim() || null;
    const phone = row.phone?.trim() || null;
    const emailKey = email?.toLowerCase() ?? null;

    const isDuplicate =
      (emailKey !== null && (existingEmails.has(emailKey) || seenEmails.has(emailKey))) ||
      (phone !== null && (existingPhones.has(phone) || seenPhones.has(phone)));

    if (isDuplicate) {
      skipped++;
      continue;
    }

    await db.lead.create({
      data: {
        name,
        email,
        phone,
        company: row.company?.trim() || null,
        source: row.source?.trim() || null,
        notes: row.notes?.trim() || null,
        stage: "new_lead",
        stageProbability: STAGE_DEFAULT_PROBABILITY.new_lead,
      },
    });
    created++;
    if (emailKey) seenEmails.add(emailKey);
    if (phone) seenPhones.add(phone);
  }

  revalidatePath("/sales/crm");
  revalidatePath("/sales/crm/leads");
  return { created, skipped };
}

export async function deleteLead(id: string) {
  await db.lead.delete({ where: { id } });
  revalidatePath("/sales/crm");
  redirect("/sales/crm");
}

/** Logs a call (status + optional result) and moves the lead's stage to
 *  match it — a call is the event that actually changes where a lead sits
 *  on the CRM board. Takes a single date/time value and splits it into
 *  SalesCall's date-only scheduledAt (used everywhere calls are grouped by
 *  day) and precise startedAt (used to disambiguate same-day calls). */
export async function logSalesCall(leadId: string, formData: FormData) {
  const occurredAtRaw = str(formData, "scheduledAt");
  if (!occurredAtRaw) throw new Error("Call date/time is required");
  const occurredAt = new Date(occurredAtRaw);
  if (Number.isNaN(occurredAt.getTime())) throw new Error("Invalid call date/time");
  const scheduledAt = occurredAt.toISOString().slice(0, 10);

  const callStatus = str(formData, "callStatus") ?? "showed";
  if (!(CALL_STATUSES as readonly string[]).includes(callStatus)) throw new Error(`Invalid call status: ${callStatus}`);
  const resultRaw = str(formData, "result");
  const result = resultRaw && (CALL_RESULTS as readonly string[]).includes(resultRaw) ? resultRaw : null;

  const cashCollected = num(formData, "cashCollected");
  const lossReason = str(formData, "lossReason") ?? (result ? RESULT_LOSS_REASON[result as CallResult] : null) ?? null;
  const recordingLink = str(formData, "recordingLink");
  const notes = str(formData, "notes");

  await db.$transaction(async (tx) => {
    // A Fathom recording may have already created a "showed, pending
    // result" row for this lead's most recent call — finish that row
    // instead of logging a second one for the same call. Only applies when
    // this log entry is itself disposing of a call that happened (showed
    // or no-show) — a fresh "booked"/"rescheduled" entry is a different,
    // future call and always gets its own row.
    const pending =
      callStatus === "showed" || callStatus === "no_show"
        ? await tx.salesCall.findFirst({
            where: { leadId, callStatus: "showed", result: null },
            orderBy: { createdAt: "desc" },
          })
        : null;

    if (pending) {
      await tx.salesCall.update({
        where: { id: pending.id },
        data: {
          scheduledAt,
          startedAt: occurredAt,
          callStatus,
          result,
          rep: str(formData, "rep"),
          recordingLink: recordingLink ?? pending.recordingLink,
          planLength: str(formData, "planLength"),
          lossReason,
          cashCollected,
          notes: notes ?? pending.notes,
        },
      });
    } else {
      await tx.salesCall.create({
        data: {
          leadId,
          scheduledAt,
          startedAt: occurredAt,
          callStatus,
          result,
          rep: str(formData, "rep"),
          recordingLink,
          planLength: str(formData, "planLength"),
          lossReason,
          cashCollected,
          notes,
        },
      });
    }

    const stage = result
      ? CALL_RESULT_TO_STAGE[result as CallResult]
      : CALL_STATUS_TO_STAGE[callStatus as CallStatus];
    const data: {
      stage?: string;
      stageProbability?: number;
      lossReason?: string | null;
      cashCollected?: { increment: number };
      nextCallAt: Date | null;
    } = {
      // A "booked"/"rescheduled" log is itself the next upcoming call; any
      // other status means the call it referred to is done, so there's
      // nothing left to count as "next."
      nextCallAt: callStatus === "booked" || callStatus === "rescheduled" ? occurredAt : null,
    };
    if (stage) {
      data.stage = stage;
      data.stageProbability = STAGE_DEFAULT_PROBABILITY[stage as LeadStage];
    }
    if (stage === "closed_lost") data.lossReason = lossReason;
    if (cashCollected) data.cashCollected = { increment: cashCollected };
    await tx.lead.update({ where: { id: leadId }, data });
  });

  revalidatePath("/sales/crm");
  revalidatePath(`/sales/crm/${leadId}`);
  revalidatePath("/sales/crm/calls");
}

/** Updates an already-logged call in place — used by the editable "last 20
 *  calls" table. Re-derives the lead's stage the same way logSalesCall
 *  does, so editing a call after the fact keeps the pipeline honest. */
export async function updateSalesCall(callId: string, formData: FormData) {
  const call = await db.salesCall.findUnique({ where: { id: callId } });
  if (!call) throw new Error("Call not found");

  const occurredAtRaw = str(formData, "scheduledAt");
  const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date(call.startedAt ?? call.scheduledAt);
  if (Number.isNaN(occurredAt.getTime())) throw new Error("Invalid call date/time");
  const scheduledAt = occurredAt.toISOString().slice(0, 10);

  const callStatus = str(formData, "callStatus") ?? call.callStatus;
  if (!(CALL_STATUSES as readonly string[]).includes(callStatus)) throw new Error(`Invalid call status: ${callStatus}`);
  const resultRaw = str(formData, "result");
  const result = resultRaw && (CALL_RESULTS as readonly string[]).includes(resultRaw) ? resultRaw : null;

  const cashCollected = num(formData, "cashCollected");
  const lossReason = str(formData, "lossReason") ?? (result ? RESULT_LOSS_REASON[result as CallResult] : null) ?? null;
  const notes = str(formData, "notes");

  await db.$transaction(async (tx) => {
    await tx.salesCall.update({
      where: { id: callId },
      data: { scheduledAt, startedAt: occurredAt, callStatus, result, cashCollected, lossReason, notes },
    });

    const stage = result
      ? CALL_RESULT_TO_STAGE[result as CallResult]
      : CALL_STATUS_TO_STAGE[callStatus as CallStatus];
    if (stage) {
      await tx.lead.update({
        where: { id: call.leadId },
        data: { stage, stageProbability: STAGE_DEFAULT_PROBABILITY[stage as LeadStage] },
      });
    }
  });

  revalidatePath("/sales/crm");
  revalidatePath(`/sales/crm/${call.leadId}`);
  revalidatePath("/sales/crm/calls");
}
