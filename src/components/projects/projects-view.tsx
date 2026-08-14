"use client";

import { useState } from "react";
import Link from "next/link";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { ProjectStatusBadge } from "@/components/issues/badges";
import { Card } from "@/components/ui/card";
import { DEPARTMENT_LABELS } from "@/lib/brain";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/work";

export type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  department: string | null;
  targetDate: string | null;
  _count: { issues: number };
};

export function ProjectsView({ projects }: { projects: ProjectRow[] }) {
  const [view, setView] = useState<"board" | "list">("board");

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
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

      {view === "board" ? <BoardView projects={projects} /> : <ListView projects={projects} />}
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectRow }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full p-3.5 transition-colors hover:border-accent">
        <h3 className="text-[0.85rem] font-bold">{project.name}</h3>
        {project.description && (
          <p className="mt-1 line-clamp-2 text-[0.76rem] text-text-dim">{project.description}</p>
        )}
        <div className="mt-2.5 flex items-center gap-2 font-mono text-[0.65rem] text-text-faint">
          {project.department && <span>{DEPARTMENT_LABELS[project.department] ?? project.department}</span>}
          <span>{project._count.issues} issue{project._count.issues === 1 ? "" : "s"}</span>
          {project.targetDate && <span>due {project.targetDate}</span>}
        </div>
      </Card>
    </Link>
  );
}

function BoardView({ projects }: { projects: ProjectRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PROJECT_STATUSES.map((status) => {
        const inColumn = projects.filter((p) => p.status === status);
        return (
          <div key={status}>
            <div className="mb-2 flex items-center gap-1.5">
              <h2 className="text-[0.78rem] font-bold">{PROJECT_STATUS_LABELS[status]}</h2>
              <span className="font-mono text-[0.65rem] text-text-faint">{inColumn.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {inColumn.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
              {inColumn.length === 0 && (
                <p className="text-[0.72rem] text-text-faint">Nothing here.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ projects }: { projects: ProjectRow[] }) {
  return (
    <Card className="overflow-hidden">
      {projects.length === 0 && (
        <div className="px-4 py-6 text-center text-[0.83rem] text-text-faint">No projects yet.</div>
      )}
      {projects.map((p) => (
        <Link
          key={p.id}
          href={`/projects/${p.id}`}
          className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] transition-colors last:border-b-0 hover:bg-surface-hover"
        >
          <span className="flex-1 truncate font-bold">{p.name}</span>
          {p.department && (
            <span className="font-mono text-[0.68rem] text-text-faint">
              {DEPARTMENT_LABELS[p.department] ?? p.department}
            </span>
          )}
          <span className="font-mono text-[0.68rem] text-text-faint">{p._count.issues} issues</span>
          {p.targetDate && <span className="font-mono text-[0.68rem] text-text-faint">{p.targetDate}</span>}
          <ProjectStatusBadge status={p.status} />
        </Link>
      ))}
    </Card>
  );
}
