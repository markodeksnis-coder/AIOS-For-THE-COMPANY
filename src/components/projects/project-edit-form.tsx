"use client";

import { useState } from "react";
import { deleteProject, updateProject } from "@/lib/actions/projects";
import { Button, Label, Select, TextArea, TextInput } from "@/components/ui/field";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/work";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from "@/lib/brain";

export function ProjectEditForm({
  project,
}: {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    department: string | null;
    targetDate: string | null;
    tags: string;
  };
}) {
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <form
      action={async (formData) => {
        setPending(true);
        await updateProject(project.id, formData);
        setPending(false);
      }}
      className="flex flex-col gap-3"
    >
      <div>
        <Label>Name</Label>
        <TextInput name="name" defaultValue={project.name} required />
      </div>
      <div>
        <Label>Description</Label>
        <TextArea name="description" defaultValue={project.description ?? ""} rows={3} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Status</Label>
          <Select name="status" defaultValue={project.status}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Department</Label>
          <Select name="department" defaultValue={project.department ?? ""}>
            <option value="">—</option>
            {DEPARTMENT_ORDER.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Target date</Label>
          <TextInput name="targetDate" type="date" defaultValue={project.targetDate ?? ""} />
        </div>
      </div>
      <div>
        <Label>Tags</Label>
        <TextInput
          name="tags"
          placeholder="q1, client-facing, urgent (comma-separated)"
          defaultValue={(JSON.parse(project.tags || "[]") as string[]).join(", ")}
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={deleting}
          className="ml-auto"
          onClick={async () => {
            if (
              !confirm(
                `Delete "${project.name}"? Its issues will be kept but unlinked from this project.`
              )
            )
              return;
            setDeleting(true);
            await deleteProject(project.id);
          }}
        >
          {deleting ? "Deleting…" : "Delete project"}
        </Button>
      </div>
    </form>
  );
}
