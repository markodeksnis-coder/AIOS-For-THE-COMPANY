"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { moveIssue } from "@/lib/actions/issues";
import { ISSUE_STATUSES, ISSUE_STATUS_LABELS, isOverdue } from "@/lib/work";
import { DEPARTMENT_GRADIENTS, DEPARTMENT_ICONS } from "@/lib/department-style";
import { ISSUE_STATUS_STYLE, assigneeColor, initials } from "@/lib/issue-style";
import { PRIORITY_COLOR } from "@/lib/project-style";
import type { IssueRow } from "@/components/issues/issue-list";

function groupByStatus(issues: IssueRow[]): Record<string, IssueRow[]> {
  const grouped: Record<string, IssueRow[]> = {};
  for (const s of ISSUE_STATUSES) grouped[s] = [];
  for (const i of issues) (grouped[i.status] ??= []).push(i);
  return grouped;
}

function findStatus(columns: Record<string, IssueRow[]>, id: string): string | null {
  for (const [status, list] of Object.entries(columns)) {
    if (list.some((i) => i.id === id)) return status;
  }
  return null;
}

function IssueCard({
  issue,
  peopleBySlug,
  dragging = false,
}: {
  issue: IssueRow;
  peopleBySlug: Map<string, string>;
  dragging?: boolean;
}) {
  const overdue = isOverdue(issue.dueDate, issue.status);
  const assigneeName = issue.assignee ? peopleBySlug.get(issue.assignee) ?? issue.assignee : null;
  const DeptIcon = issue.department ? DEPARTMENT_ICONS[issue.department] ?? Building2 : null;

  return (
    <Card
      className={
        "p-3 transition-all " + (dragging ? "rotate-1 scale-105 shadow-2xl" : "hover:border-accent")
      }
    >
      <div className="flex items-start gap-1.5">
        {issue.priority !== "none" && (
          <span
            className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: PRIORITY_COLOR[issue.priority] ?? "#64748B" }}
          />
        )}
        <p className="flex-1 text-[0.8rem] font-semibold leading-snug">{issue.title}</p>
        {assigneeName && (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.55rem] font-bold text-white"
            style={{ backgroundColor: assigneeColor(assigneeName) }}
            title={assigneeName}
          >
            {initials(assigneeName)}
          </span>
        )}
      </div>

      {issue.project && (
        <div className="mt-1.5">
          <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[0.62rem] text-text-faint">
            {issue.project.name}
          </span>
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-2 font-mono text-[0.62rem] text-text-faint">
        {DeptIcon && issue.department && (
          <span
            className="flex items-center gap-1 rounded px-1 py-0.5"
            style={{ backgroundImage: DEPARTMENT_GRADIENTS[issue.department] }}
          >
            <DeptIcon size={9} className="text-white" />
          </span>
        )}
        {issue.dueDate && (
          <span className={overdue ? "font-bold text-critical" : ""}>
            {overdue ? "overdue" : issue.dueDate}
          </span>
        )}
      </div>
    </Card>
  );
}

function SortableIssueCard({ issue, peopleBySlug }: { issue: IssueRow; peopleBySlug: Map<string, string> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    data: { status: issue.status },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link href={`/issues/${issue.id}`} onClick={(e) => isDragging && e.preventDefault()} draggable={false}>
        <IssueCard issue={issue} peopleBySlug={peopleBySlug} />
      </Link>
    </div>
  );
}

function DroppableColumn({ status, empty, children }: { status: string; empty: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className="flex min-h-[60px] flex-col gap-2 rounded-xl border border-dashed p-1 transition-colors"
      style={{ borderColor: isOver ? "var(--accent)" : empty ? "var(--border)" : "transparent" }}
    >
      {children}
    </div>
  );
}

export function IssuesBoard({
  issues,
  people,
}: {
  issues: IssueRow[];
  people: { slug: string; title: string }[];
}) {
  const peopleBySlug = new Map(people.map((p) => [p.slug, p.title]));
  const [columns, setColumns] = useState<Record<string, IssueRow[]>>(() => groupByStatus(issues));
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => setColumns(groupByStatus(issues)), [issues]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeStatus = findStatus(columns, String(active.id));
    const overStatus = findStatus(columns, String(over.id)) ?? String(over.id);
    if (!activeStatus || !ISSUE_STATUSES.includes(overStatus as never)) return;

    setColumns((prev) => {
      const next = { ...prev };
      const sourceList = [...next[activeStatus]];
      const movedIndex = sourceList.findIndex((i) => i.id === active.id);
      if (movedIndex === -1) return prev;
      const [moved] = sourceList.splice(movedIndex, 1);

      const destList = activeStatus === overStatus ? sourceList : [...next[overStatus]];
      const overIndex = destList.findIndex((i) => i.id === over.id);
      const insertAt = overIndex === -1 ? destList.length : overIndex;
      destList.splice(insertAt, 0, { ...moved, status: overStatus });

      next[activeStatus] = activeStatus === overStatus ? destList : sourceList;
      next[overStatus] = destList;

      void moveIssue(
        moved.id,
        overStatus,
        destList.map((i) => i.id)
      );

      return next;
    });
  }

  const activeIssue = activeId
    ? Object.values(columns)
        .flat()
        .find((i) => i.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ISSUE_STATUSES.map((status) => {
          const style = ISSUE_STATUS_STYLE[status];
          const inColumn = columns[status] ?? [];
          return (
            <div key={status}>
              <div
                className="mb-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                style={{ backgroundColor: style.wash }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: style.bar }} />
                <h2 className="text-[0.76rem] font-bold" style={{ color: style.text }}>
                  {ISSUE_STATUS_LABELS[status]}
                </h2>
                <span className="ml-auto font-mono text-[0.65rem] text-text-faint">{inColumn.length}</span>
              </div>
              <SortableContext items={inColumn.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <DroppableColumn status={status} empty={inColumn.length === 0}>
                  {inColumn.map((i) => (
                    <SortableIssueCard key={i.id} issue={i} peopleBySlug={peopleBySlug} />
                  ))}
                  {inColumn.length === 0 && (
                    <p className="px-2 py-3 text-center text-[0.7rem] text-text-faint">Drop here</p>
                  )}
                </DroppableColumn>
              </SortableContext>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeIssue ? <IssueCard issue={activeIssue} peopleBySlug={peopleBySlug} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
