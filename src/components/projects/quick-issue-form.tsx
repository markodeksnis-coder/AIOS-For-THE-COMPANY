"use client";

import { useState } from "react";
import { createIssue } from "@/lib/actions/issues";
import { Card } from "@/components/ui/card";
import { Button, Select, TextInput } from "@/components/ui/field";
import { ISSUE_PRIORITIES, ISSUE_PRIORITY_LABELS } from "@/lib/work";

type PersonOption = { slug: string; title: string };

export function QuickIssueForm({
  projectId,
  department,
  people,
}: {
  projectId: string;
  department: string | null;
  people: PersonOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)} className="text-[0.78rem]">
        + Add issue
      </Button>
    );
  }

  return (
    <Card className="mb-3 p-3.5">
      <form
        action={async (formData) => {
          setPending(true);
          await createIssue(formData);
        }}
        className="flex flex-col gap-2.5"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="status" value="todo" />
        {department && <input type="hidden" name="department" value={department} />}
        <TextInput name="title" placeholder="What needs doing?" required autoFocus />
        <div className="grid grid-cols-2 gap-2.5">
          <Select name="priority" defaultValue="none">
            {ISSUE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {ISSUE_PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
          <Select name="assignee" defaultValue="">
            <option value="">Unassigned</option>
            {people.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="text-[0.78rem]">
            {pending ? "Adding…" : "Add issue"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-[0.78rem]">
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
