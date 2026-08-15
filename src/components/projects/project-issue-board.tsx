"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { setIssueField } from "@/lib/actions/issues";
import { ISSUE_STATUSES, ISSUE_STATUS_LABELS, isOverdue, type IssueStatus } from "@/lib/work";

export type MiniIssue = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string | null;
  dueDate: string | null;
};

const COLUMN_STYLE: Record<IssueStatus, { bar: string; wash: string; text: string }> = {
  backlog: { bar: "#64748B", wash: "rgba(100,116,139,0.10)", text: "#94A3B8" },
  todo: { bar: "#3B82F6", wash: "rgba(59,130,246,0.10)", text: "#60A5FA" },
  in_progress: { bar: "#8B5CF6", wash: "rgba(139,92,246,0.10)", text: "#A78BFA" },
  done: { bar: "#22C55E", wash: "rgba(34,197,94,0.10)", text: "#4ADE80" },
  canceled: { bar: "#EF4444", wash: "rgba(239,68,68,0.10)", text: "#F87171" },
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#EF4444",
  high: "#F97316",
  medium: "#3B82F6",
  low: "#64748B",
};

function IssueCard({ issue, dragging = false }: { issue: MiniIssue; dragging?: boolean }) {
  const overdue = isOverdue(issue.dueDate, issue.status);
  return (
    <Card
      className={
        "p-2.5 transition-all " + (dragging ? "rotate-1 scale-105 shadow-2xl" : "hover:border-accent")
      }
    >
      <div className="flex items-start gap-1.5">
        {issue.priority !== "none" && (
          <span
            className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: PRIORITY_COLOR[issue.priority] ?? "#64748B" }}
          />
        )}
        <p className="flex-1 text-[0.78rem] font-semibold leading-snug">{issue.title}</p>
      </div>
      {(issue.assignee || issue.dueDate) && (
        <div className="mt-1.5 flex items-center gap-2 font-mono text-[0.62rem] text-text-faint">
          {issue.assignee && <span>{issue.assignee}</span>}
          {issue.dueDate && (
            <span className={overdue ? "font-bold text-critical" : ""}>
              {overdue ? "overdue" : issue.dueDate}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

function DraggableIssueCard({ issue }: { issue: MiniIssue }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: issue.id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link href={`/issues/${issue.id}`} onClick={(e) => isDragging && e.preventDefault()} draggable={false}>
        <IssueCard issue={issue} />
      </Link>
    </div>
  );
}

function DroppableColumn({
  status,
  children,
}: {
  status: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className="flex min-h-[50px] flex-col gap-1.5 rounded-lg border border-dashed p-1 transition-colors"
      style={{ borderColor: isOver ? "var(--accent)" : "transparent" }}
    >
      {children}
    </div>
  );
}

function groupByStatus(issues: MiniIssue[]): Record<string, MiniIssue[]> {
  const grouped: Record<string, MiniIssue[]> = {};
  for (const s of ISSUE_STATUSES) grouped[s] = [];
  for (const i of issues) (grouped[i.status] ??= []).push(i);
  return grouped;
}

export function ProjectIssueBoard({ issues }: { issues: MiniIssue[] }) {
  const [columns, setColumns] = useState<Record<string, MiniIssue[]>>(() => groupByStatus(issues));
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

    const targetStatus = String(over.id);
    if (!ISSUE_STATUSES.includes(targetStatus as never)) return;

    let moved: MiniIssue | undefined;
    for (const list of Object.values(columns)) {
      const found = list.find((i) => i.id === active.id);
      if (found) moved = found;
    }
    if (!moved || moved.status === targetStatus) return;

    setColumns((prev) => {
      const next: Record<string, MiniIssue[]> = {};
      for (const [status, list] of Object.entries(prev)) {
        next[status] = list.filter((i) => i.id !== moved!.id);
      }
      next[targetStatus] = [...next[targetStatus], { ...moved!, status: targetStatus }];
      return next;
    });

    void setIssueField(moved.id, "status", targetStatus);
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
          const style = COLUMN_STYLE[status];
          const inColumn = columns[status] ?? [];
          return (
            <div key={status}>
              <div
                className="mb-2 flex items-center gap-1.5 rounded-lg px-2 py-1"
                style={{ backgroundColor: style.wash }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.bar }} />
                <h3 className="text-[0.7rem] font-bold" style={{ color: style.text }}>
                  {ISSUE_STATUS_LABELS[status]}
                </h3>
                <span className="ml-auto font-mono text-[0.6rem] text-text-faint">{inColumn.length}</span>
              </div>
              <DroppableColumn status={status}>
                {inColumn.map((i) => (
                  <DraggableIssueCard key={i.id} issue={i} />
                ))}
                {inColumn.length === 0 && (
                  <p className="px-1 py-2 text-center text-[0.65rem] text-text-faint">Drop here</p>
                )}
              </DroppableColumn>
            </div>
          );
        })}
      </div>
      <DragOverlay>{activeIssue ? <IssueCard issue={activeIssue} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}
