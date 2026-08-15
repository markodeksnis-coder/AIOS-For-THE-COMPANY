"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PROJECT_STATUSES } from "@/lib/work";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/** "q1, client-facing,  urgent" -> ["q1", "client-facing", "urgent"] */
function parseTags(formData: FormData): string {
  const raw = formData.get("tags");
  if (typeof raw !== "string") return "[]";
  const tags = raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return JSON.stringify([...new Set(tags)]);
}

export async function createProject(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const project = await db.project.create({
    data: {
      name,
      description: str(formData, "description"),
      status: str(formData, "status") ?? "planning",
      department: str(formData, "department"),
      targetDate: str(formData, "targetDate"),
      tags: parseTags(formData),
    },
  });

  revalidatePath("/projects");
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(id: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  await db.project.update({
    where: { id },
    data: {
      name,
      description: str(formData, "description"),
      status: str(formData, "status") ?? "planning",
      department: str(formData, "department"),
      targetDate: str(formData, "targetDate"),
      tags: parseTags(formData),
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
}

export async function setProjectStatus(id: string, status: string) {
  if (!PROJECT_STATUSES.includes(status as never)) {
    throw new Error(`Invalid status: ${status}`);
  }
  await db.project.update({ where: { id }, data: { status } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
}

/** Persists a drag-and-drop move: one card's new status/position, and the
 *  resulting order of every other card left in its column (source and/or
 *  destination) so the whole column stays contiguously ordered. */
export async function moveProject(
  movedId: string,
  status: string,
  columnOrder: string[]
) {
  if (!PROJECT_STATUSES.includes(status as never)) {
    throw new Error(`Invalid status: ${status}`);
  }
  await db.$transaction([
    db.project.update({ where: { id: movedId }, data: { status } }),
    ...columnOrder.map((id, index) =>
      db.project.update({ where: { id }, data: { order: index } })
    ),
  ]);
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function deleteProject(id: string) {
  await db.project.delete({ where: { id } });
  revalidatePath("/projects");
  revalidatePath("/issues");
  revalidatePath("/");
  redirect("/projects");
}
