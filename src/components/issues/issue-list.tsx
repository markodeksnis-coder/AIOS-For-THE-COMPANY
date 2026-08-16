"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { setIssueField } from "@/lib/actions/issues";
import { NewIssueForm } from "@/components/issues/new-issue-form";
import { IssuesBoard } from "@/components/issues/issues-board";
import { Card } from "@/components/ui/card";
import {
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  isOverdue,
} from "@/lib/work";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from "@/lib/brain";
import { DEPARTMENT_GRADIENTS, DEPARTMENT_ICONS } from "@/lib/department-style";
import { ISSUE_STATUS_STYLE, assigneeColor, initials } from "@/lib/issue-style";
import { PRIORITY_COLOR } from "@/lib/project-style";

export type IssueRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  department: string | null;
  assignee: string | null;
  dueDate: string | null;
  order: number;
  project: { id: string; name: string } | null;
};

type PersonOption = { slug: string; title: string };
type ProjectOption = { id: string; name: string };

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide transition-colors " +
        (active
          ? "border-accent bg-accent-wash text-accent-strong"
          : "border-border text-text-faint hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

export function IssueList({
  issues,
  people,
  projects,
}: {
  issues: IssueRow[];
  people: PersonOption[];
  projects: ProjectOption[];
}) {
  const [view, setView] = useState<"board" | "list">("board");
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  const peopleBySlug = useMemo(() => new Map(people.map((p) => [p.slug, p.title])), [people]);

  const filtered = issues.filter((i) => {
    if (deptFilter && i.department !== deptFilter) return false;
    if (priorityFilter && i.priority !== priorityFilter) return false;
    return true;
  });

  const activeDepts = useMemo(
    () => DEPARTMENT_ORDER.filter((d) => issues.some((i) => i.department === d)),
    [issues]
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <NewIssueForm people={people} projects={projects} />
        <div className="ml-auto flex gap-1 rounded-lg border border-border p-0.5">
          {(["board", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                "rounded-md px-2.5 py-1 text-[0.75rem] font-semibold capitalize transition-colors " +
                (view === v ? "bg-accent-wash text-accent-strong" : "text-text-faint hover:text-foreground")
              }
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <FilterChip active={deptFilter === null} onClick={() => setDeptFilter(null)}>
          All depts
        </FilterChip>
        {activeDepts.map((d) => (
          <FilterChip key={d} active={deptFilter === d} onClick={() => setDeptFilter(deptFilter === d ? null : d)}>
            {DEPARTMENT_LABELS[d]}
          </FilterChip>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        {ISSUE_PRIORITIES.filter((p) => p !== "none").map((p) => (
          <FilterChip
            key={p}
            active={priorityFilter === p}
            onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
          >
            {ISSUE_PRIORITY_LABELS[p]}
          </FilterChip>
        ))}
        <span className="ml-auto font-mono text-[0.72rem] text-text-faint">
          {filtered.length}/{issues.length}
        </span>
      </div>

      {view === "board" ? (
        <IssuesBoard issues={filtered} people={people} />
      ) : (
        <ListView issues={filtered} peopleBySlug={peopleBySlug} />
      )}
    </div>
  );
}

function ListView({
  issues,
  peopleBySlug,
}: {
  issues: IssueRow[];
  peopleBySlug: Map<string, string>;
}) {
  const [, startTransition] = useTransition();

  return (
    <Card className="overflow-hidden">
      {issues.length === 0 && (
        <div className="px-4 py-6 text-center text-[0.83rem] text-text-faint">
          No issues match these filters.
        </div>
      )}
      {issues.map((issue) => {
        const overdue = isOverdue(issue.dueDate, issue.status);
        const assigneeName = issue.assignee ? peopleBySlug.get(issue.assignee) ?? issue.assignee : null;
        const DeptIcon = issue.department ? DEPARTMENT_ICONS[issue.department] ?? Building2 : null;
        const statusStyle = ISSUE_STATUS_STYLE[issue.status];

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
              className="rounded-md border px-1.5 py-1 font-mono text-[0.68rem] font-bold focus:outline-none"
              style={{ borderColor: statusStyle.bar, backgroundColor: statusStyle.wash, color: statusStyle.text }}
            >
              {ISSUE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ISSUE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>

            {issue.priority !== "none" && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: PRIORITY_COLOR[issue.priority] ?? "#64748B" }}
                title={ISSUE_PRIORITY_LABELS[issue.priority as never]}
              />
            )}

            <Link href={`/issues/${issue.id}`} className="flex-1 truncate font-bold hover:text-accent">
              {issue.title}
            </Link>

            {issue.project && (
              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[0.68rem] text-text-faint">
                {issue.project.name}
              </span>
            )}

            {DeptIcon && issue.department && (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold text-white"
                style={{ backgroundImage: DEPARTMENT_GRADIENTS[issue.department] }}
              >
                <DeptIcon size={10} />
                {DEPARTMENT_LABELS[issue.department] ?? issue.department}
              </span>
            )}

            {assigneeName && (
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold text-white"
                style={{ backgroundColor: assigneeColor(assigneeName) }}
                title={assigneeName}
              >
                {initials(assigneeName)}
              </span>
            )}

            {issue.dueDate && (
              <span className={`font-mono text-[0.68rem] ${overdue ? "font-bold text-critical" : "text-text-faint"}`}>
                {overdue ? "overdue " : ""}
                {issue.dueDate}
              </span>
            )}
          </div>
        );
      })}
    </Card>
  );
}
