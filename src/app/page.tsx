import Link from "next/link";
import { Building2, ListTodo, FolderKanban, BarChart3, AlertTriangle, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/icon-tile";
import { ProjectStatusBadge } from "@/components/issues/badges";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER, parseYamlBody } from "@/lib/brain";
import { DEPARTMENT_ICONS, DEPARTMENT_GRADIENTS } from "@/lib/department-style";
import { NEUTRAL_GRADIENT, parseTags, tagColor } from "@/lib/project-style";
import { isOverdue } from "@/lib/work";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [company, departments, activeProjects, openIssues, overdueIssues, kpiCount] = await Promise.all([
    db.brainFile.findUnique({ where: { slug: "company" } }),
    db.brainFile.findMany({ where: { type: "department" } }),
    db.project.findMany({
      where: { status: "active" },
      include: { issues: { select: { status: true } } },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
    db.issue.count({ where: { status: { in: ["backlog", "todo", "in_progress"] } } }),
    db.issue.findMany({
      where: { status: { in: ["backlog", "todo", "in_progress"] }, dueDate: { not: null } },
    }),
    db.brainFile.findMany({ where: { type: "department" } }).then((files) =>
      files.reduce((sum, f) => {
        const data = (parseYamlBody(f) ?? {}) as { kpis?: unknown[] };
        return sum + (data.kpis?.length ?? 0);
      }, 0)
    ),
  ]);

  const companyData = company ? (parseYamlBody(company) as { name?: string } | null) : null;
  const companyName = companyData?.name ?? "The Company";
  const overdueCount = overdueIssues.filter((i) => isOverdue(i.dueDate, i.status)).length;

  const sortedDepartments = [...departments].sort(
    (a, b) =>
      DEPARTMENT_ORDER.indexOf(a.department ?? "") - DEPARTMENT_ORDER.indexOf(b.department ?? "")
  );

  return (
    <div className="mx-auto max-w-6xl">
      {company?.status === "draft" && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-warn/35 bg-warn-wash px-4 py-3 text-[0.83rem]">
          <span>⚠️</span>
          <span>
            <strong className="text-warn">Company name not set.</strong> Currently showing as
            &ldquo;{companyName}&rdquo; — a placeholder. Set the real name in{" "}
            <code className="font-mono">brain/company.yaml</code> and it updates everywhere.
          </span>
        </div>
      )}

      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          {companyName}
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Home</h1>
        <p className="mt-1 max-w-[60ch] text-[0.88rem] text-text-dim">
          Live from Issues, Projects, and Scorecards — this is what&apos;s actually happening
          right now, not a snapshot.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={Building2}
          gradient="linear-gradient(135deg, #6366F1, #8B5CF6)"
          num={departments.length}
          label="Departments"
          href="/teams"
        />
        <StatTile
          icon={FolderKanban}
          gradient="linear-gradient(135deg, #22C55E, #4ADE80)"
          num={activeProjects.length}
          label="Active projects"
          href="/projects"
        />
        <StatTile
          icon={ListTodo}
          gradient="linear-gradient(135deg, #3B82F6, #14B8A6)"
          num={openIssues}
          label="Open issues"
          href="/issues"
        />
        <StatTile
          icon={overdueCount > 0 ? AlertTriangle : BarChart3}
          gradient={
            overdueCount > 0
              ? "linear-gradient(135deg, #EF4444, #F97316)"
              : "linear-gradient(135deg, #F59E0B, #F97316)"
          }
          num={overdueCount > 0 ? overdueCount : kpiCount}
          label={overdueCount > 0 ? "Overdue issues" : "KPIs tracked"}
          href={overdueCount > 0 ? "/inbox" : "/scorecards"}
        />
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[0.95rem] font-extrabold">Active projects</h2>
          <Link href="/projects" className="text-[0.78rem] font-semibold text-accent hover:underline">
            View board →
          </Link>
        </div>
        {activeProjects.length === 0 ? (
          <Card className="px-4 py-6 text-center text-[0.83rem] text-text-faint">
            No active projects right now.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeProjects.map((p) => {
              const gradient = p.department ? DEPARTMENT_GRADIENTS[p.department] ?? NEUTRAL_GRADIENT : NEUTRAL_GRADIENT;
              const Icon = p.department ? DEPARTMENT_ICONS[p.department] ?? Building2 : Building2;
              const tags = parseTags(p.tags);
              const total = p.issues.length;
              const done = p.issues.filter((i) => i.status === "done").length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="relative h-full overflow-hidden p-3.5 transition-all hover:border-accent hover:-translate-y-0.5">
                    <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundImage: gradient }} aria-hidden />
                    <div className="pl-2">
                      <div className="mb-2 flex items-center gap-2">
                        <IconTile icon={Icon} gradient={gradient} size="sm" />
                        <h3 className="flex-1 truncate text-[0.85rem] font-bold">{p.name}</h3>
                        <ProjectStatusBadge status={p.status} />
                      </div>
                      {tags.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
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
                      {total > 0 && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundImage: gradient }} />
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[0.95rem] font-extrabold">Departments</h2>
          <Link href="/teams" className="text-[0.78rem] font-semibold text-accent hover:underline">
            Teams &amp; Members →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sortedDepartments.map((d) => {
            const data = parseYamlBody(d) as { kpis?: unknown[]; team?: unknown[] } | null;
            const dept = d.department ?? "";
            return (
              <Link key={d.slug} href={`/departments/${dept}`}>
                <Card className="h-full p-4 transition-all hover:border-accent hover:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_16px_32px_-16px_rgba(99,102,241,0.35)]">
                  <div className="flex items-center gap-2.5">
                    <IconTile
                      icon={DEPARTMENT_ICONS[dept] ?? Building2}
                      gradient={DEPARTMENT_GRADIENTS[dept] ?? "linear-gradient(135deg, #64748B, #94A3B8)"}
                    />
                    <h3 className="text-[0.9rem] font-bold">{DEPARTMENT_LABELS[dept] ?? dept}</h3>
                  </div>
                  <div className="mt-3 flex gap-3 font-mono text-[0.68rem] text-text-faint">
                    <span>{data?.team?.length ?? 0} team</span>
                    <span>{data?.kpis?.length ?? 0} kpis</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatTile({
  icon,
  gradient,
  num,
  label,
  href,
}: {
  icon: LucideIcon;
  gradient: string;
  num: number;
  label: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full p-4 transition-colors hover:border-accent">
        <IconTile icon={icon} gradient={gradient} size="sm" className="mb-2.5" />
        <div className="font-mono text-2xl tabular-nums">{num}</div>
        <div className="mt-0.5 text-[0.78rem] text-text-dim">{label}</div>
      </Card>
    </Link>
  );
}
