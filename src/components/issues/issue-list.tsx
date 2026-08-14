"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { setIssueField } from "@/lib/actions/issues";
import { NewIssueForm } from "@/components/issues/new-issue-form";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import {
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  isOverdue,
} from "@/lib/work";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from "@/lib/brain";

export type IssueRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  department: string | null;
  assignee: string | null;
  dueDate: string | null;
  project: { id: string; name: string } | null;
};

type PersonOption = { slug: string; title: string };
type ProjectOption = { id: string; name: string };

export function IssueList({
  issues,
  people,
  projects,
}: {
  issues: IssueRow[];
  people: PersonOption[];
  projects: ProjectOption[];
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [, startTransition] = useTransition();

  const peopleBySlug = useMemo(() => new Map(people.map((p) => [p.slug, p.title])), [people]);

  const filtered = issues.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (deptFilter !== "all" && i.department !== deptFilter) return false;
    return true;
  });

  return (
    <div>
      <NewIssueForm people={people} projects={projects} />

      <div className="mb-3 flex flex-wrap gap-2">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-auto"
        >
          <option value="all">All statuses</option>
          {ISSUE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ISSUE_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-auto">
          <option value="all">All departments</option>
          {DEPARTMENT_ORDER.map((d) => (
            <option key={d} value={d}>
              {DEPARTMENT_LABELS[d]}
            </option>
          ))}
        </Select>
        <span className="ml-auto self-center font-mono text-[0.72rem] text-text-faint">
          {filtered.length}/{issues.length}
        </span>
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-[0.83rem] text-text-faint">
            No issues match these filters.
          </div>
        )}
        {filtered.map((issue) => {
          const overdue = isOverdue(issue.dueDate, issue.status);
          return (
            <div
              key={issue.id}
              className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] last:border-b-0"
            >
              <select
                defaultValue={issue.status}
                onChange={(e) =>
                  startTransition(() => {
                    setIssueField(issue.id, "status", e.target.value);
                  })
                }
                className="rounded-md border border-border bg-surface-2 px-1.5 py-1 font-mono text-[0.68rem] text-text-dim focus:border-accent focus:outline-none"
              >
                {ISSUE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ISSUE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>

              <Link href={`/issues/${issue.id}`} className="flex-1 truncate font-bold hover:text-accent">
                {issue.title}
              </Link>

              {issue.project && (
                <span className="font-mono text-[0.68rem] text-text-faint">{issue.project.name}</span>
              )}

              {issue.department && (
                <span className="font-mono text-[0.68rem] text-text-faint">
                  {DEPARTMENT_LABELS[issue.department] ?? issue.department}
                </span>
              )}

              {issue.assignee && (
                <span className="font-mono text-[0.68rem] text-text-faint">
                  {peopleBySlug.get(issue.assignee) ?? issue.assignee}
                </span>
              )}

              {issue.dueDate && (
                <span className={`font-mono text-[0.68rem] ${overdue ? "text-critical" : "text-text-faint"}`}>
                  {overdue ? "overdue " : ""}
                  {issue.dueDate}
                </span>
              )}

              <select
                defaultValue={issue.priority}
                onChange={(e) =>
                  startTransition(() => {
                    setIssueField(issue.id, "priority", e.target.value);
                  })
                }
                className="rounded-md border border-border bg-surface-2 px-1.5 py-1 font-mono text-[0.68rem] text-text-dim focus:border-accent focus:outline-none"
              >
                {ISSUE_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {ISSUE_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
