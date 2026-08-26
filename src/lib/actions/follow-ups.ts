"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

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

function revalidateFollowUps() {
  revalidatePath("/sales/crm/follow-ups");
}

/** Queues a new follow-up (or logs one already sent, if "already sent" is
 *  checked) — the one entry point for both the today/tomorrow queue and
 *  the sent history, same as SalesCall covers both booked and showed. */
export async function createFollowUpTouch(formData: FormData) {
  const leadId = str(formData, "leadId");
  if (!leadId) throw new Error("Lead is required");
  const templateName = str(formData, "templateName");
  if (!templateName) throw new Error("Template/reason name is required");

  const dueAtRaw = str(formData, "dueAt");
  if (!dueAtRaw) throw new Error("Due date/time is required");
  const dueAt = new Date(dueAtRaw);
  if (Number.isNaN(dueAt.getTime())) throw new Error("Invalid due date/time");

  const alreadySent = formData.get("alreadySent") === "on";
  const sentAtRaw = str(formData, "sentAt");
  const sentAt = alreadySent ? new Date(sentAtRaw ?? dueAtRaw) : null;
  if (sentAt && Number.isNaN(sentAt.getTime())) throw new Error("Invalid sent date/time");

  await db.followUpTouch.create({
    data: {
      leadId,
      templateName,
      loomUrl: str(formData, "loomUrl"),
      dueAt,
      sentAt,
      notes: str(formData, "notes"),
    },
  });

  revalidateFollowUps();
}

/** One-click "it went out" — bound directly to a button, no form. */
export async function markFollowUpSent(id: string) {
  await db.followUpTouch.update({ where: { id }, data: { sentAt: new Date() } });
  revalidateFollowUps();
}

/** One-click "they replied." */
export async function markFollowUpReplied(id: string) {
  await db.followUpTouch.update({ where: { id }, data: { repliedAt: new Date() } });
  revalidateFollowUps();
}

/** One-click "this is what got them to book" — ties a touch back to the
 *  pipeline outcome it produced. */
export async function markFollowUpBooked(id: string) {
  await db.followUpTouch.update({ where: { id }, data: { bookedFromThis: true } });
  revalidateFollowUps();
}

/** Logs watch data pulled by hand from Loom's own view dashboard. */
export async function updateFollowUpWatch(id: string, formData: FormData) {
  await db.followUpTouch.update({
    where: { id },
    data: {
      watched: formData.get("watched") === "on",
      viewCount: num(formData, "viewCount"),
    },
  });
  revalidateFollowUps();
}

export async function deleteFollowUpTouch(id: string) {
  await db.followUpTouch.delete({ where: { id } });
  revalidateFollowUps();
}
