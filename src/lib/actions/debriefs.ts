"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { CLOSER_STEPS, OBJECTION_TYPES, ROOT_CAUSES } from "@/lib/crm";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function score(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 10 ? Math.round(n) : null;
}

function oneOf<T extends string>(formData: FormData, key: string, allowed: readonly T[]): T | null {
  const v = str(formData, key);
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

/** Upserts the one debrief a call can have — filling it in again just edits the same row. */
export async function saveDebrief(salesCallId: string, formData: FormData) {
  const call = await db.salesCall.findUnique({ where: { id: salesCallId }, select: { leadId: true } });
  if (!call) throw new Error("Call not found");

  const objectionType = oneOf(formData, "objectionType", OBJECTION_TYPES);

  const data = {
    endReason: str(formData, "endReason"),
    notEstablished: str(formData, "notEstablished"),
    scriptAdherence: score(formData, "scriptAdherence"),
    weakestStep: oneOf(formData, "weakestStep", CLOSER_STEPS),
    prospectDream: str(formData, "prospectDream"),
    prospectBlocker: str(formData, "prospectBlocker"),
    commitmentScore: score(formData, "commitmentScore"),
    finalObjection: str(formData, "finalObjection"),
    objectionType,
    objectionOther: objectionType === "other" ? str(formData, "objectionOther") : null,
    doubtMoment: str(formData, "doubtMoment"),
    replayMoment: str(formData, "replayMoment"),
    rootCause: oneOf(formData, "rootCause", ROOT_CAUSES),
  };

  await db.callDebrief.upsert({
    where: { salesCallId },
    create: { salesCallId, ...data },
    update: data,
  });

  revalidatePath("/sales/crm/debriefs");
  revalidatePath(`/sales/crm/debriefs/${salesCallId}`);
  revalidatePath(`/sales/crm/${call.leadId}`);
}
