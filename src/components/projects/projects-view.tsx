"use client";

import { useEffect, useMemo, useState } from "react";
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
import { NewProjectForm } from "@/components/projects/new-project-form";
import { ProjectStatusBadge } from "@/components/issues/badges";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/icon-tile";
import { DEPARTMENT_LABELS } from "@/lib/brain";
import { DEPARTMENT_GRADIENTS, DEPARTMENT_ICONS } from "@/lib/department-style";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, isOverdue } from "@/lib/work";
import { moveProject } from "@/lib/actions/projects";
import {
  NEUTRAL_GRADIENT,
  PROJECT_STATUS_STYLE as STATUS_COLUMN_STYLE,
  PRIORITY_COLOR,
  highestPriority,
  parseTags,
  tagColor,
} from "@/lib/project-style";

export type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  department: string | null;
  targetDate: string | null;
  tags: string;
  issues: { status: string; priority: string }[];
};

export function ProjectsView({ projects }: { projects: ProjectRow[] }) {
  const [view, setView] = useState<"board" | "list">("board");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) for (const t of parseTags(p.tags)) set.add(t);
    return [...set].sort();
  }, [projects]);

  const filtered = useMemo(
    () => (activeTag ? projects.filter((p) => parseTags(p.tags).includes(activeTag)) : projects),
    [projects, activeTag]
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <NewProjectForm />
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

      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTag(null)}
            className={
              "rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide transition-colors " +
              (activeTag === null
                ? "border-accent bg-accent-wash text-accent-strong"
                : "border-border text-text-faint hover:text-foreground")
            }
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className="rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide transition-colors"
              style={
                activeTag === tag
                  ? { borderColor: tagColor(tag), backgroundColor: `${tagColor(tag)}22`, color: tagColor(tag) }
                  : { borderColor: "var(--border)", color: "var(--text-faint)" }
              }
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {view === "board" ? <BoardView projects={filtered} /> : <ListView projects={filtered} />}
    </div>
  );
}

function ProjectCard({ project, dragging = false }: { project: ProjectRow; dragging?: boolean }) {
  const gradient = project.department
    ? DEPARTMENT_GRADIENTS[project.department] ?? NEUTRAL_GRADIENT
    : NEUTRAL_GRADIENT;
  const Icon = project.department ? DEPARTMENT_ICONS[project.department] ?? Building2 : Building2;
  const tags = parseTags(project.tags);
  const total = project.issues.length;
  const done = project.issues.filter((i) => i.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const priority = highestPriority(project.issues);
  const overdue = isOverdue(project.targetDate, project.status);

  return (
    <Card
      className={
        "group relative overflow-hidden p-3.5 transition-all " +
        (dragging ? "rotate-2 scale-105 shadow-2xl" : "hover:border-accent hover:-translate-y-0.5")
      }
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundImage: gradient }}
        aria-hidden
      />
      <div className="pl-2">
        <div className="mb-2 flex items-start gap-2">
          <IconTile icon={Icon} gradient={gradient} size="sm" />
          <h3 className="flex-1 pt-0.5 text-[0.85rem] font-bold leading-tight">{project.name}</h3>
          {priority && (
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: PRIORITY_COLOR[priority] }}
              title={`${priority} priority issue in this project`}
            />
          )}
        </div>

        {project.description && (
          <p className="mb-2.5 line-clamp-2 text-[0.76rem] text-text-dim">{project.description}</p>
        )}

        {tags.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide"
                style={{ backgroundColor: `${tagColor(t)}22`, color: tagColor(t) }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {total > 0 && (
          <div className="mb-2.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundImage: gradient }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 font-mono text-[0.65rem] text-text-faint">
          {project.department && <span>{DEPARTMENT_LABELS[project.department] ?? project.department}</span>}
          {total > 0 && (
            <span>
              {done}/{total} done
            </span>
          )}
          {project.targetDate && (
            <span className={overdue ? "font-bold text-critical" : ""}>
              {overdue ? "overdue " : "due "}
              {project.targetDate}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function SortableProjectCard({ project }: { project: ProjectRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    data: { status: project.status },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link href={`/projects/${project.id}`} onClick={(e) => isDragging && e.preventDefault()} draggable={false}>
        <ProjectCard project={project} />
      </Link>
    </div>
  );
}

function BoardView({ projects }: { projects: ProjectRow[] }) {
  const [columns, setColumns] = useState<Record<string, ProjectRow[]>>(() => groupByStatus(projects));
  const [activeId, setActiveId] = useState<string | null>(null);

  // Re-derive from server props whenever the filtered set changes (tag filter, revalidation).
  useEffect(() => setColumns(groupByStatus(projects)), [projects]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeStatus = findCardStatus(columns, String(active.id));
    const overStatus = findCardStatus(columns, String(over.id)) ?? String(over.id);
    if (!activeStatus || !PROJECT_STATUSES.includes(overStatus as never)) return;

    setColumns((prev) => {
      const next = { ...prev };
      const sourceList = [...next[activeStatus]];
      const movedIndex = sourceList.findIndex((p) => p.id === active.id);
      if (movedIndex === -1) return prev;
      const [moved] = sourceList.splice(movedIndex, 1);

      const destList = activeStatus === overStatus ? sourceList : [...next[overStatus]];
      const overIndex = destList.findIndex((p) => p.id === over.id);
      const insertAt = overIndex === -1 ? destList.length : overIndex;
      destList.splice(insertAt, 0, { ...moved, status: overStatus });

      next[activeStatus] = activeStatus === overStatus ? destList : sourceList;
      next[overStatus] = destList;

      void moveProject(
        moved.id,
        overStatus,
        destList.map((p) => p.id)
      );

      return next;
    });
  }

  const activeProject = activeId
    ? Object.values(columns)
        .flat()
        .find((p) => p.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROJECT_STATUSES.map((status) => {
          const style = STATUS_COLUMN_STYLE[status];
          const inColumn = columns[status] ?? [];
          return (
            <div key={status}>
              <div
                className="mb-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                style={{ backgroundColor: style.wash }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: style.bar }} />
                <h2 className="text-[0.78rem] font-bold" style={{ color: style.text }}>
                  {PROJECT_STATUS_LABELS[status]}
                </h2>
                <span className="ml-auto font-mono text-[0.65rem] text-text-faint">{inColumn.length}</span>
              </div>
              <SortableContext items={inColumn.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <DroppableColumn status={status} empty={inColumn.length === 0}>
                  {inColumn.map((p) => (
                    <SortableProjectCard key={p.id} project={p} />
                  ))}
                  {inColumn.length === 0 && (
                    <p className="px-2 py-3 text-center text-[0.72rem] text-text-faint">Drop here</p>
                  )}
                </DroppableColumn>
              </SortableContext>
            </div>
          );
        })}
      </div>
      <DragOverlay>{activeProject ? <ProjectCard project={activeProject} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({
  status,
  empty,
  children,
}: {
  status: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className="flex min-h-[60px] flex-col gap-2 rounded-xl border border-dashed p-1 transition-colors"
      style={{
        borderColor: isOver ? "var(--accent)" : empty ? "var(--border)" : "transparent",
      }}
    >
      {children}
    </div>
  );
}

function groupByStatus(projects: ProjectRow[]): Record<string, ProjectRow[]> {
  const grouped: Record<string, ProjectRow[]> = {};
  for (const status of PROJECT_STATUSES) grouped[status] = [];
  for (const p of projects) (grouped[p.status] ??= []).push(p);
  return grouped;
}

function findCardStatus(columns: Record<string, ProjectRow[]>, id: string): string | null {
  for (const [status, list] of Object.entries(columns)) {
    if (list.some((p) => p.id === id)) return status;
  }
  return null;
}

function ListView({ projects }: { projects: ProjectRow[] }) {
  return (
    <Card className="overflow-hidden">
      {projects.length === 0 && (
        <div className="px-4 py-6 text-center text-[0.83rem] text-text-faint">No projects yet.</div>
      )}
      {projects.map((p) => {
        const gradient = p.department ? DEPARTMENT_GRADIENTS[p.department] ?? NEUTRAL_GRADIENT : NEUTRAL_GRADIENT;
        const Icon = p.department ? DEPARTMENT_ICONS[p.department] ?? Building2 : Building2;
        const tags = parseTags(p.tags);
        const total = p.issues.length;
        const done = p.issues.filter((i) => i.status === "done").length;
        return (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] transition-colors last:border-b-0 hover:bg-surface-hover"
          >
            <IconTile icon={Icon} gradient={gradient} size="sm" />
            <span className="flex-1 truncate font-bold">{p.name}</span>
            {tags.length > 0 && (
              <div className="hidden gap-1 sm:flex">
                {tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide"
                    style={{ backgroundColor: `${tagColor(t)}22`, color: tagColor(t) }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {p.department && (
              <span className="font-mono text-[0.68rem] text-text-faint">
                {DEPARTMENT_LABELS[p.department] ?? p.department}
              </span>
            )}
            {total > 0 && (
              <span className="font-mono text-[0.68rem] text-text-faint">
                {done}/{total} issues
              </span>
            )}
            {p.targetDate && <span className="font-mono text-[0.68rem] text-text-faint">{p.targetDate}</span>}
            <ProjectStatusBadge status={p.status} />
          </Link>
        );
      })}
    </Card>
  );
}
