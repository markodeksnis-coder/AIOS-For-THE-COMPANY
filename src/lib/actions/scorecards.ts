"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export async function addScorecardEntry(formData: FormData) {
  const department = str(formData, "department");
  const kpiName = str(formData, "kpiName");
  const period = str(formData, "period");
  const valueRaw = str(formData, "value");

  if (!department || !kpiName || !period || !valueRaw) {
    throw new Error("Department, KPI, period, and value are all required");
  }
  const value = Number(valueRaw);
  if (Number.isNaN(value)) throw new Error("Value must be a number");

  await db.scorecardEntry.create({
    data: { department, kpiName, period, value, note: str(formData, "note") },
  });

  revalidatePath("/scorecards");
  revalidatePath(`/departments/${department}`);
}

export async function deleteScorecardEntry(id: string, department: string) {
  await db.scorecardEntry.delete({ where: { id } });
  revalidatePath("/scorecards");
  revalidatePath(`/departments/${department}`);
}
