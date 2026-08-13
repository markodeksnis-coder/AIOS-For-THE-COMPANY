import Link from "next/link";
import { Building2, Users, BookOpen, LayoutGrid, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/icon-tile";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER, parseYamlBody } from "@/lib/brain";
import { DEPARTMENT_ICONS, DEPARTMENT_GRADIENTS } from "@/lib/department-style";

export default async function HomePage() {
  const [departments, people, playbooks, apps] = await Promise.all([
    db.brainFile.findMany({ where: { type: "department" } }),
    db.brainFile.findMany({ where: { type: "person" } }),
    db.brainFile.findMany({ where: { type: "playbook" } }),
    db.brainFile.findMany({ where: { type: "app" } }),
  ]);

  const sortedDepartments = [...departments].sort(
    (a, b) =>
      DEPARTMENT_ORDER.indexOf(a.department ?? "") - DEPARTMENT_ORDER.indexOf(b.department ?? "")
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-warn/35 bg-warn-wash px-4 py-3 text-[0.83rem]">
        <span>⚠️</span>
        <span>
          <strong className="text-warn">Company name unconfirmed.</strong> Everything here uses
          &ldquo;Business &amp; Fitness,&rdquo; guessed from an old screenshot. Correct{" "}
          <code className="font-mono">brain/company.yaml</code> and it updates everywhere,
          including this page.
        </span>
      </div>

      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Phase 2 · live reader
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">What&apos;s in the brain</h1>
        <p className="mt-1 max-w-[56ch] text-[0.88rem] text-text-dim">
          Every number on this page is read live from <code className="font-mono">/brain</code>{" "}
          via <code className="font-mono">npm run sync-brain</code> — nothing here is hardcoded.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={Building2}
          gradient="linear-gradient(135deg, #6366F1, #8B5CF6)"
          num={departments.length}
          label="Departments"
        />
        <StatTile
          icon={Users}
          gradient="linear-gradient(135deg, #3B82F6, #14B8A6)"
          num={people.length}
          label={`People (${people.filter((p) => !p.slug.startsWith("sample-")).length} real)`}
        />
        <StatTile
          icon={BookOpen}
          gradient="linear-gradient(135deg, #F59E0B, #F97316)"
          num={playbooks.length}
          label="Playbooks (draft v1)"
        />
        <StatTile
          icon={LayoutGrid}
          gradient="linear-gradient(135deg, #22C55E, #4ADE80)"
          num={apps.length}
          label="Apps connected"
        />
      </div>

      <section className="mb-8">
        <h2 className="mb-1 text-[0.95rem] font-extrabold">Departments</h2>
        <p className="mb-3 text-[0.76rem] text-text-faint">
          Click through to see mission, KPIs, team, and apps for each.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                    <h3 className="text-[0.9rem] font-bold">
                      {DEPARTMENT_LABELS[dept] ?? dept}
                    </h3>
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

      <section>
        <h2 className="mb-3 text-[0.95rem] font-extrabold">People</h2>
        <Card className="overflow-hidden">
          {people.map((p) => (
            <div
              key={p.slug}
              className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] last:border-b-0"
            >
              <span className="flex-1 font-bold">{p.title}</span>
              <span className="font-mono text-[0.68rem] text-text-faint">
                {DEPARTMENT_LABELS[p.department ?? ""] ?? p.department ?? "—"}
              </span>
              <Badge variant={p.slug.startsWith("sample-") ? "sample" : "default"}>
                {p.slug.startsWith("sample-") ? "sample" : "real"}
              </Badge>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}

function StatTile({
  icon,
  gradient,
  num,
  label,
}: {
  icon: LucideIcon;
  gradient: string;
  num: number;
  label: string;
}) {
  return (
    <Card className="p-4">
      <IconTile icon={icon} gradient={gradient} size="sm" className="mb-2.5" />
      <div className="font-mono text-2xl tabular-nums">{num}</div>
      <div className="mt-0.5 text-[0.78rem] text-text-dim">{label}</div>
    </Card>
  );
}
