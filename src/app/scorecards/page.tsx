import { db } from "@/lib/db";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER, parseYamlBody } from "@/lib/brain";
import { KpiCard } from "@/components/scorecards/kpi-card";
import type { DeptKpi } from "@/lib/scorecards";

export const dynamic = "force-dynamic";

export default async function ScorecardsPage() {
  const [departmentFiles, entries] = await Promise.all([
    db.brainFile.findMany({ where: { type: "department" } }),
    db.scorecardEntry.findMany(),
  ]);

  const kpisByDept = new Map<string, DeptKpi[]>();
  for (const file of departmentFiles) {
    if (!file.department) continue;
    const data = (parseYamlBody(file) ?? {}) as { kpis?: DeptKpi[] };
    kpisByDept.set(file.department, data.kpis ?? []);
  }

  const totalKpis = [...kpisByDept.values()].reduce((sum, kpis) => sum + kpis.length, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Company · Scorecards
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Scorecards</h1>
        <p className="mt-1 text-[0.88rem] text-text-dim">
          {totalKpis} KPIs tracked across {kpisByDept.size} departments. Targets and definitions
          come from <code className="text-text-faint">/brain</code>; the numbers below are real,
          logged over time.
        </p>
      </div>

      {DEPARTMENT_ORDER.filter((dept) => (kpisByDept.get(dept) ?? []).length > 0).map((dept) => {
        const kpis = kpisByDept.get(dept) ?? [];
        return (
          <section key={dept} id={dept} className="mb-8">
            <h2 className="mb-3 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
              {DEPARTMENT_LABELS[dept] ?? dept}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {kpis.map((kpi) => (
                <KpiCard
                  key={kpi.name}
                  department={dept}
                  kpi={kpi}
                  entries={entries.filter(
                    (e) => e.department === dept && e.kpiName === kpi.name
                  )}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
