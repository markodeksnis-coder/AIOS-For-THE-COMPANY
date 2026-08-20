"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LEAD_STAGES, CALL_OUTCOMES } from "@/lib/crm";

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

export async function createLead(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const lead = await db.lead.create({
    data: {
      name,
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      source: str(formData, "source"),
      stage: str(formData, "stage") ?? "booked",
      tags: parseTagsInput(str(formData, "tags")),
      notes: str(formData, "notes"),
    },
  });

  revalidatePath("/sales/crm");
  redirect(`/sales/crm/${lead.id}`);
}

export async function updateLead(id: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await db.lead.update({
    where: { id },
    data: {
      name,
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      source: str(formData, "source"),
      tags: parseTagsInput(str(formData, "tags")),
      notes: str(formData, "notes"),
    },
  });

  revalidatePath("/sales/crm");
  revalidatePath(`/sales/crm/${id}`);
}

export async function setLeadStage(id: string, stage: string) {
  if (!LEAD_STAGES.includes(stage as never)) throw new Error(`Invalid stage: ${stage}`);
  await db.lead.update({ where: { id }, data: { stage } });
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

/** Logs a call and moves the lead's stage to match the outcome — a call is
 *  the event that actually changes where a lead sits on the CRM board. */
export async function logSalesCall(leadId: string, formData: FormData) {
  const scheduledAt = str(formData, "scheduledAt");
  const outcome = str(formData, "outcome") ?? "booked";
  if (!scheduledAt) throw new Error("Call date is required");
  if (!CALL_OUTCOMES.includes(outcome as never)) throw new Error(`Invalid outcome: ${outcome}`);

  const cashCollected = num(formData, "cashCollected");

  await db.$transaction(async (tx) => {
    await tx.salesCall.create({
      data: {
        leadId,
        scheduledAt,
        outcome,
        cashCollected,
        notes: str(formData, "notes"),
      },
    });

    // A call's outcome always reflects the lead's current stage — canceled
    // is the one exception, since a canceled call doesn't tell us anything
    // new about where the lead stands.
    const data: { stage?: string; cashCollected?: { increment: number } } = {};
    if (outcome !== "canceled") data.stage = outcome;
    if (cashCollected) data.cashCollected = { increment: cashCollected };
    if (Object.keys(data).length) {
      await tx.lead.update({ where: { id: leadId }, data });
    }
  });

  revalidatePath("/sales/crm");
  revalidatePath(`/sales/crm/${leadId}`);
  revalidatePath("/sales/crm/calls");
}
