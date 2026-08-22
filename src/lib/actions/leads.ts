"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LEAD_STAGES, LOGGABLE_CALL_OUTCOMES, OUTCOME_TO_STAGE, OUTCOME_LOSS_REASON } from "@/lib/crm";

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

function parseTagsInput(raw: string | null): string {
  if (!raw) return "[]";
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return JSON.stringify(tags);
}

function leadFieldsFromForm(formData: FormData) {
  const nextCallAtRaw = str(formData, "nextCallAt");
  return {
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    timezone: str(formData, "timezone"),
    source: str(formData, "source"),
    funnel: str(formData, "funnel"),
    productInterest: str(formData, "productInterest"),
    targetPrice: num(formData, "targetPrice"),
    repName: str(formData, "repName"),
    tags: parseTagsInput(str(formData, "tags")),
    notes: str(formData, "notes"),
    dealValue: num(formData, "dealValue"),
    stageProbability: num(formData, "stageProbability"),
    location: str(formData, "location"),
    instagramOrLinkedin: str(formData, "instagramOrLinkedin"),
    yearsRunningAgency: num(formData, "yearsRunningAgency"),
    monthlyRevenue: num(formData, "monthlyRevenue"),
    sellsService: str(formData, "sellsService"),
    nextCallAt: nextCallAtRaw ? new Date(nextCallAtRaw) : null,
  };
}

export async function createLead(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const lead = await db.lead.create({
    data: { name, stage: str(formData, "stage") ?? "new_lead", ...leadFieldsFromForm(formData) },
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
  await db.lead.update({ where: { id }, data: { stage } });
  revalidatePath("/sales/crm");
  revalidatePath(`/sales/crm/${id}`);
}

/** Marks a call confirmed ahead of time — a state change, not a call outcome. */
export async function confirmLead(id: string) {
  await db.lead.update({ where: { id }, data: { stage: "confirmed" } });
  revalidatePath("/sales/crm");
  revalidatePath(`/sales/crm/${id}`);
}

/** Persists a drag-and-drop move on the CRM board. */
export async function moveLead(movedId: string, stage: string, columnOrder: string[]) {
  if (!LEAD_STAGES.includes(stage as never)) throw new Error(`Invalid stage: ${stage}`);
  await db.$transaction([
    db.lead.update({ where: { id: movedId }, data: { stage } }),
    ...columnOrder.map((id, index) => db.lead.update({ where: { id }, data: { order: index } })),
  ]);
  revalidatePath("/sales/crm");
}

export async function deleteLead(id: string) {
  await db.lead.delete({ where: { id } });
  revalidatePath("/sales/crm");
  redirect("/sales/crm");
}

/** Logs a call disposition and moves the lead's stage to match it — a call
 *  is the event that actually changes where a lead sits on the CRM board. */
export async function logSalesCall(leadId: string, formData: FormData) {
  const scheduledAt = str(formData, "scheduledAt");
  const outcome = str(formData, "outcome") ?? "no_show";
  if (!scheduledAt) throw new Error("Call date is required");
  if (!LOGGABLE_CALL_OUTCOMES.includes(outcome as never)) throw new Error(`Invalid outcome: ${outcome}`);

  const cashCollected = num(formData, "cashCollected");
  const lossReason = str(formData, "lossReason") ?? OUTCOME_LOSS_REASON[outcome as never] ?? null;
  const recordingLink = str(formData, "recordingLink");
  const notes = str(formData, "notes");

  await db.$transaction(async (tx) => {
    // A Fathom recording may have already created a "completed, pending
    // disposition" row for this lead's most recent call — finish that row
    // instead of logging a second one for the same call.
    const pending = await tx.salesCall.findFirst({
      where: { leadId, outcome: "completed" },
      orderBy: { createdAt: "desc" },
    });

    if (pending) {
      await tx.salesCall.update({
        where: { id: pending.id },
        data: {
          scheduledAt,
          outcome,
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
          outcome,
          rep: str(formData, "rep"),
          recordingLink,
          planLength: str(formData, "planLength"),
          lossReason,
          cashCollected,
          notes,
        },
      });
    }

    const stage = OUTCOME_TO_STAGE[outcome as never];
    const data: { stage?: string; lossReason?: string | null; cashCollected?: { increment: number } } = {};
    if (stage) data.stage = stage;
    if (stage === "closed_lost") data.lossReason = lossReason;
    if (cashCollected) data.cashCollected = { increment: cashCollected };
    if (Object.keys(data).length) await tx.lead.update({ where: { id: leadId }, data });
  });

  revalidatePath("/sales/crm");
  revalidatePath(`/sales/crm/${leadId}`);
  revalidatePath("/sales/crm/calls");
}
