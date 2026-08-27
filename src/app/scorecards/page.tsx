import Link from "next/link";
import { db } from "@/lib/db";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER, parseYamlBody } from "@/lib/brain";
import { KpiCard } from "@/components/scorecards/kpi-card";
import type { DeptKpi } from "@/lib/scorecards";

export const dynamic = "force-dynamic";

// Every current use of `entries` (latest value, a sparkline of the most
// recent 12, a "recent 5" list) only ever needs recent history — but this
// used to fetch every ScorecardEntry ever logged, unbounded, on every page
// load. Default to a window wide enough for typical logging cadence, with
// ?range=all as an explicit escape hatch rather than silently hiding older
// data with no way back to it.
const DEFAULT_RANGE_DAYS = 90;

export default async function ScorecardsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const showAll = range === "all";
  const since = new Date(Date.now() - DEFAULT_RANGE_DAYS * 86_400_000).toISOString().slice(0, 10);

  const [departmentFiles, entries] = await Promise.all([
    db.brainFile.findMany({ where: { type: "department" } }),
    db.scorecardEntry.findMany({ where: showAll ? undefined : { period: { gte: since } } }),
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
        <p className="mt-1 text-[0.78rem] text-text-faint">
          {showAll ? (
            <>
              Showing all-time entries. <Link href="/scorecards" className="text-accent-strong">View last {DEFAULT_RANGE_DAYS} days</Link>
            </>
          ) : (
            <>
              Showing the last {DEFAULT_RANGE_DAYS} days.{" "}
              <Link href="/scorecards?range=all" className="text-accent-strong">View all-time</Link>
            </>
          )}
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
