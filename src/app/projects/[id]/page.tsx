import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/icon-tile";
import { ProjectEditForm } from "@/components/projects/project-edit-form";
import { ProjectStatusSelect } from "@/components/projects/project-status-select";
import { ProjectIssueBoard } from "@/components/projects/project-issue-board";
import { QuickIssueForm } from "@/components/projects/quick-issue-form";
import { DEPARTMENT_LABELS, parseYamlBody, stripWikilink } from "@/lib/brain";
import { DEPARTMENT_GRADIENTS, DEPARTMENT_ICONS } from "@/lib/department-style";
import { NEUTRAL_GRADIENT, parseTags, tagColor } from "@/lib/project-style";
import { isOverdue } from "@/lib/work";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
    include: { issues: { orderBy: { createdAt: "desc" } } },
  });

  if (!project) notFound();

  const [deptFile, people, docsCount] = await Promise.all([
    project.department
      ? db.brainFile.findFirst({ where: { type: "department", department: project.department } })
      : null,
    db.brainFile.findMany({ where: { type: "person" }, select: { slug: true, title: true } }),
    project.department
      ? db.brainFile.count({ where: { type: "doc", department: project.department } })
      : 0,
  ]);

  let teamRows: { slug: string; title: string }[] = [];
  if (deptFile) {
    const data = (parseYamlBody(deptFile) ?? {}) as { team?: string[] };
    const teamSlugs = (data.team ?? []).map(stripWikilink);
    if (teamSlugs.length) {
      teamRows = await db.brainFile.findMany({
        where: { slug: { in: teamSlugs } },
        select: { slug: true, title: true },
      });
    }
  }

  const gradient = project.department ? DEPARTMENT_GRADIENTS[project.department] ?? NEUTRAL_GRADIENT : NEUTRAL_GRADIENT;
  const Icon = project.department ? DEPARTMENT_ICONS[project.department] ?? Building2 : Building2;
  const tags = parseTags(project.tags);
  const total = project.issues.length;
  const done = project.issues.filter((i) => i.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = isOverdue(project.targetDate, project.status);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/projects" className="mb-4 inline-block text-[0.8rem] text-text-dim hover:text-accent">
        ← All projects
      </Link>

      {/* Hero */}
      <Card className="relative mb-6 overflow-hidden p-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-[0.15]"
          style={{ backgroundImage: gradient }}
          aria-hidden
        />
        <div className="relative flex items-start gap-4">
          <IconTile icon={Icon} gradient={gradient} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">{project.name}</h1>
              <ProjectStatusSelect id={project.id} status={project.status} />
            </div>
            {project.description && (
              <p className="mt-1.5 max-w-[70ch] text-[0.86rem] text-text-dim">{project.description}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide"
                  style={{ backgroundColor: `${tagColor(t)}22`, color: tagColor(t) }}
                >
                  {t}
                </span>
              ))}
              {project.department && (
                <Link
                  href={`/departments/${project.department}`}
                  className="rounded-full border border-border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-text-dim transition-colors hover:border-accent hover:text-accent"
                >
                  {DEPARTMENT_LABELS[project.department] ?? project.department}
                </Link>
              )}
              {project.targetDate && (
                <span
                  className={
                    "font-mono text-[0.68rem] " + (overdue ? "font-bold text-critical" : "text-text-faint")
                  }
                >
                  {overdue ? "overdue — was due" : "due"} {project.targetDate}
                </span>
              )}
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="relative mt-5 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundImage: gradient }}
              />
            </div>
            <span className="shrink-0 font-mono text-[0.72rem] text-text-faint">
              {done}/{total} issues done · {pct}%
            </span>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        {/* Main: issue board */}
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
              Issues in this project ({total})
            </h2>
            <QuickIssueForm projectId={project.id} department={project.department} people={people} />
          </div>
          {total === 0 ? (
            <Card className="px-4 py-8 text-center text-[0.83rem] text-text-faint">
              No issues linked yet — add one above.
            </Card>
          ) : (
            <ProjectIssueBoard issues={project.issues} />
          )}
        </section>

        {/* Sidebar: connected-to-the-OS info + settings */}
        <aside className="flex flex-col gap-4">
          {deptFile && (
            <Card className="p-4">
              <h2 className="mb-3 font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">
                Related
              </h2>
              <Link
                href={`/departments/${project.department}`}
                className="mb-3 flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-[0.82rem] font-semibold transition-colors hover:border-accent"
              >
                <IconTile icon={Icon} gradient={gradient} size="sm" />
                {DEPARTMENT_LABELS[project.department!] ?? project.department}
              </Link>
              {teamRows.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-text-faint">
                    Team
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {teamRows.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/docs/${p.slug}`}
                        className="rounded-full border border-border px-2 py-0.5 text-[0.7rem] font-semibold transition-colors hover:border-accent"
                      >
                        {p.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <Link
                href={`/docs?department=${project.department}`}
                className="text-[0.78rem] font-semibold text-accent hover:underline"
              >
                {docsCount} department doc{docsCount === 1 ? "" : "s"} →
              </Link>
            </Card>
          )}

          <Card className="p-4">
            <h2 className="mb-3 font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">
              Settings
            </h2>
            <ProjectEditForm project={project} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
