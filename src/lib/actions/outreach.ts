"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function int(formData: FormData, key: string): number {
  const raw = str(formData, key);
  if (raw === null) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${key} must be a number`);
  return Math.round(n);
}

function float(formData: FormData, key: string): number {
  const raw = str(formData, key);
  if (raw === null) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${key} must be a number`);
  return n;
}

/** Logs one date+setter+source's numbers — updates the existing row if
 *  that combination is already logged, so a correction never creates a
 *  duplicate. */
export async function upsertOutreachLog(formData: FormData) {
  const date = str(formData, "date");
  const setter = str(formData, "setter");
  const source = str(formData, "source");
  if (!date || !setter || !source) throw new Error("Date, setter, and source are all required");

  const data = {
    dmsSent: int(formData, "dmsSent"),
    messagesSeen: int(formData, "messagesSeen"),
    repliesReceived: int(formData, "repliesReceived"),
    positiveReplies: int(formData, "positiveReplies"),
    membersJoined: int(formData, "membersJoined"),
    appointmentsBooked: int(formData, "appointmentsBooked"),
    shows: int(formData, "shows"),
    noShows: int(formData, "noShows"),
    cashCollected: float(formData, "cashCollected"),
    note: str(formData, "note"),
  };

  await db.outreachLog.upsert({
    where: { date_setter_source: { date, setter, source } },
    create: { date, setter, source, ...data },
    update: data,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/outbound");
  revalidatePath("/dashboard/appointments");
}

export async function deleteOutreachLog(id: string) {
  await db.outreachLog.delete({ where: { id } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/outbound");
  revalidatePath("/dashboard/appointments");
}
