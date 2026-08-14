"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PROJECT_STATUSES } from "@/lib/work";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
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

export async function deleteProject(id: string) {
  await db.project.delete({ where: { id } });
  revalidatePath("/projects");
  revalidatePath("/issues");
  revalidatePath("/");
  redirect("/projects");
}
