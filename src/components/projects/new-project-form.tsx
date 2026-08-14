"use client";

import { useState } from "react";
import { createProject } from "@/lib/actions/projects";
import { Card } from "@/components/ui/card";
import { Button, Label, Select, TextArea, TextInput } from "@/components/ui/field";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/work";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from "@/lib/brain";

export function NewProjectForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="mb-4">
        + New project
      </Button>
    );
  }

  return (
    <Card className="mb-4 p-4">
      <form
        action={async (formData) => {
          setPending(true);
          await createProject(formData);
        }}
        className="flex flex-col gap-3"
      >
        <div>
          <Label>Name</Label>
          <TextInput name="name" placeholder="Project name" required autoFocus />
        </div>
        <div>
          <Label>Description</Label>
          <TextArea name="description" rows={2} placeholder="Optional details…" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Status</Label>
            <Select name="status" defaultValue="planning">
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select name="department" defaultValue="">
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
            <TextInput name="targetDate" type="date" />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create project"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
