"use client";

import { useState } from "react";
import { deleteIssue, updateIssue } from "@/lib/actions/issues";
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

export function IssueEditForm({
  issue,
  people,
  projects,
}: {
  issue: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    department: string | null;
    assignee: string | null;
    dueDate: string | null;
    projectId: string | null;
  };
  people: PersonOption[];
  projects: ProjectOption[];
}) {
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <form
      action={async (formData) => {
        setPending(true);
        await updateIssue(issue.id, formData);
        setPending(false);
      }}
      className="flex flex-col gap-3"
    >
      <div>
        <Label>Title</Label>
        <TextInput name="title" defaultValue={issue.title} required />
      </div>
      <div>
        <Label>Description</Label>
        <TextArea name="description" defaultValue={issue.description ?? ""} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label>Status</Label>
          <Select name="status" defaultValue={issue.status}>
            {ISSUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ISSUE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Priority</Label>
          <Select name="priority" defaultValue={issue.priority}>
            {ISSUE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {ISSUE_PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Department</Label>
          <Select name="department" defaultValue={issue.department ?? ""}>
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
          <TextInput name="dueDate" type="date" defaultValue={issue.dueDate ?? ""} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Assignee</Label>
          <Select name="assignee" defaultValue={issue.assignee ?? ""}>
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
          <Select name="projectId" defaultValue={issue.projectId ?? ""}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
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
            if (!confirm(`Delete "${issue.title}"? This can't be undone.`)) return;
            setDeleting(true);
            await deleteIssue(issue.id);
          }}
        >
          {deleting ? "Deleting…" : "Delete issue"}
        </Button>
      </div>
    </form>
  );
}
