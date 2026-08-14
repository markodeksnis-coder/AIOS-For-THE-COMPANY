"use client";

import { useState } from "react";
import { createIssue } from "@/lib/actions/issues";
import { Card } from "@/components/ui/card";
import { Button, Label, Select, TextArea, TextInput } from "@/components/ui/field";
import {
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
} from "@/lib/work";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from "@/lib/brain";

type PersonOption = { slug: string; title: string };
type ProjectOption = { id: string; name: string };

export function NewIssueForm({
  people,
  projects,
}: {
  people: PersonOption[];
  projects: ProjectOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="mb-4">
        + New issue
      </Button>
    );
  }

  return (
    <Card className="mb-4 p-4">
      <form
        action={async (formData) => {
          setPending(true);
          await createIssue(formData);
        }}
        className="flex flex-col gap-3"
      >
        <div>
          <Label>Title</Label>
          <TextInput name="title" placeholder="What needs doing?" required autoFocus />
        </div>
        <div>
          <Label>Description</Label>
          <TextArea name="description" rows={2} placeholder="Optional details…" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Label>Status</Label>
            <Select name="status" defaultValue="todo">
              {ISSUE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ISSUE_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select name="priority" defaultValue="none">
              {ISSUE_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {ISSUE_PRIORITY_LABELS[p]}
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
            <Label>Due date</Label>
            <TextInput name="dueDate" type="date" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Assignee</Label>
            <Select name="assignee" defaultValue="">
              <option value="">Unassigned</option>
              {people.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Project</Label>
            <Select name="projectId" defaultValue="">
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create issue"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
