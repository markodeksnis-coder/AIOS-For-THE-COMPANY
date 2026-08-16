"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "@/lib/work";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export async function createIssue(formData: FormData) {
  const title = str(formData, "title");
  if (!title) throw new Error("Title is required");

  const issue = await db.issue.create({
    data: {
      title,
      description: str(formData, "description"),
      status: (str(formData, "status") as string) ?? "todo",
      priority: (str(formData, "priority") as string) ?? "none",
      department: str(formData, "department"),
      assignee: str(formData, "assignee"),
      dueDate: str(formData, "dueDate"),
      projectId: str(formData, "projectId"),
    },
  });

  revalidatePath("/issues");
  revalidatePath("/inbox");
  revalidatePath("/");
  redirect(`/issues/${issue.id}`);
}

export async function updateIssue(id: string, formData: FormData) {
  const title = str(formData, "title");
  if (!title) throw new Error("Title is required");

  await db.issue.update({
    where: { id },
    data: {
      title,
      description: str(formData, "description"),
      status: str(formData, "status") ?? "todo",
      priority: str(formData, "priority") ?? "none",
      department: str(formData, "department"),
      assignee: str(formData, "assignee"),
      dueDate: str(formData, "dueDate"),
      projectId: str(formData, "projectId"),
    },
  });

  revalidatePath("/issues");
  revalidatePath(`/issues/${id}`);
  revalidatePath("/inbox");
  revalidatePath("/");
}

export async function setIssueField(id: string, field: "status" | "priority", value: string) {
  if (field === "status" && !ISSUE_STATUSES.includes(value as never)) {
    throw new Error(`Invalid status: ${value}`);
  }
  if (field === "priority" && !ISSUE_PRIORITIES.includes(value as never)) {
    throw new Error(`Invalid priority: ${value}`);
  }

  await db.issue.update({ where: { id }, data: { [field]: value } });

  revalidatePath("/issues");
  revalidatePath(`/issues/${id}`);
  revalidatePath("/inbox");
  revalidatePath("/");
}

/** Persists a drag-and-drop move: one issue's new status/position, and the
 *  resulting order of every other issue left in its column. */
export async function moveIssue(movedId: string, status: string, columnOrder: string[]) {
  if (!ISSUE_STATUSES.includes(status as never)) {
    throw new Error(`Invalid status: ${status}`);
  }
  await db.$transaction([
    db.issue.update({ where: { id: movedId }, data: { status } }),
    ...columnOrder.map((id, index) => db.issue.update({ where: { id }, data: { order: index } })),
  ]);
  revalidatePath("/issues");
  revalidatePath("/inbox");
  revalidatePath("/");
}

export async function deleteIssue(id: string) {
  await db.issue.delete({ where: { id } });
  revalidatePath("/issues");
  revalidatePath("/inbox");
  revalidatePath("/");
  redirect("/issues");
}

export async function addComment(issueId: string, formData: FormData) {
  const body = str(formData, "body");
  if (!body) return;

  await db.issueComment.create({
    data: { issueId, body, author: str(formData, "author") ?? "Marko" },
  });

  revalidatePath(`/issues/${issueId}`);
}
