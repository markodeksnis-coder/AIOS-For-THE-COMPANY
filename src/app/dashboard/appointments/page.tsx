import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { DashboardTabs } from "@/components/outreach/dashboard-tabs";
import { FilterBar } from "@/components/outreach/filter-bar";
import { SETTERS, SOURCES, sumOutreach, groupByKey } from "@/lib/outreach";

export const dynamic = "force-dynamic";

export default async function AppointmentReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; setter?: string; source?: string }>;
}) {
  const { range: rangeParam, setter: setterParam, source: sourceParam } = await searchParams;
  const range = rangeParam ?? "30";
  const setter = setterParam ?? "all";
  const source = sourceParam ?? "all";

  const since =
    range === "all" ? null : new Date(Date.now() - Number(range) * 86_400_000).toISOString().slice(0, 10);

  const allRows = await db.outreachLog.findMany({
    where: {
      ...(since ? { date: { gte: since } } : {}),
      ...(setter !== "all" ? { setter } : {}),
      ...(source !== "all" ? { source } : {}),
    },
    orderBy: { date: "desc" },
  });
  // Only rows with something to report — a day/setter/source logged purely
  // for DMs/replies with zero appointment activity shouldn't pad this table.
  const rows = allRows.filter((r) => r.appointmentsBooked > 0 || r.shows > 0 || r.noShows > 0);

  const totals = sumOutreach(allRows);
  const bySetter = [...groupByKey(rows, (r) => r.setter).entries()].map(([key, group]) => ({
    key,
    ...sumOutreach(group),
  }));
  const bySource = [...groupByKey(rows, (r) => r.source).entries()].map(([key, group]) => ({
    key,
    ...sumOutreach(group),
  }));

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">Company · Dashboard</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Appointment Reporting</h1>
        <p className="mt-1 text-[0.88rem] text-text-dim">
          Appointments booked, shows, and no-shows from cold outbound — same hand-logged rows as{" "}
          <Link href="/dashboard/outbound" className="text-accent-strong">
            Cold Outbound
          </Link>
          , grouped by outcome instead of by message volume.
        </p>
      </div>

      <DashboardTabs active="/dashboard/appointments" />
      <FilterBar
        basePath="/dashboard/appointments"
        range={range}
        setter={setter}
        source={source}
        setters={SETTERS}
        sources={SOURCES}
      />

      <section className="mb-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Appointments booked" value={String(totals.appointmentsBooked)} />
          <StatTile label="Shows" value={String(totals.shows)} good />
          <StatTile label="No-shows" value={String(totals.noShows)} />
          <StatTile label="Show rate" value={`${totals.showRate}%`} good />
          <StatTile label="Won value" value={`$${totals.cashCollected.toLocaleString()}`} good />
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AppointmentTable title="By setter" rows={bySetter} />
        <AppointmentTable title="By source" rows={bySource} />
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
          Logged days ({rows.length})
        </h2>
        <Card className="overflow-x-auto p-4">
          {rows.length === 0 ? (
            <p className="text-[0.8rem] text-text-faint">
              No appointment activity logged yet for this filter. Log it from{" "}
              <Link href="/dashboard/outbound" className="text-accent-strong">
                Cold Outbound
              </Link>
              .
            </p>
          ) : (
            <table className="w-full text-[0.78rem]">
              <thead>
                <tr className="border-b border-border text-left text-text-faint">
                  <th className="pb-1.5 font-medium">Date</th>
                  <th className="pb-1.5 font-medium">Setter</th>
                  <th className="pb-1.5 font-medium">Source</th>
                  <th className="pb-1.5 text-right font-medium">Booked</th>
                  <th className="pb-1.5 text-right font-medium">Shows</th>
                  <th className="pb-1.5 text-right font-medium">No-shows</th>
                  <th className="pb-1.5 text-right font-medium">Cash</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0">
                    <td className="py-1.5 font-mono text-text-faint">{r.date}</td>
                    <td className="py-1.5 font-semibold">{r.setter}</td>
                    <td className="py-1.5">{r.source}</td>
                    <td className="py-1.5 text-right font-mono">{r.appointmentsBooked}</td>
                    <td className="py-1.5 text-right font-mono text-good">{r.shows}</td>
                    <td className="py-1.5 text-right font-mono">{r.noShows}</td>
                    <td className="py-1.5 text-right font-mono font-bold text-good">
                      ${r.cashCollected.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}

function StatTile({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <Card className="p-3">
      <div className="text-[0.68rem] text-text-faint">{label}</div>
      <div className={`mt-0.5 font-mono text-[1.1rem] font-bold ${good ? "text-good" : "text-foreground"}`}>{value}</div>
    </Card>
  );
}

function AppointmentTable({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; appointmentsBooked: number; shows: number; noShows: number; showRate: number; cashCollected: number }[];
}) {
  return (
    <Card className="overflow-x-auto p-4">
      <h2 className="mb-3 text-[0.8rem] font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-[0.8rem] text-text-faint">No data yet.</p>
      ) : (
        <table className="w-full text-[0.78rem]">
          <thead>
            <tr className="border-b border-border text-left text-text-faint">
              <th className="pb-1.5 font-medium">{title.replace("By ", "")}</th>
              <th className="pb-1.5 text-right font-medium">Booked</th>
              <th className="pb-1.5 text-right font-medium">Shows</th>
              <th className="pb-1.5 text-right font-medium">Show %</th>
              <th className="pb-1.5 text-right font-medium">Cash</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-border last:border-b-0">
                <td className="py-1.5 font-semibold">{r.key}</td>
                <td className="py-1.5 text-right font-mono">{r.appointmentsBooked}</td>
                <td className="py-1.5 text-right font-mono text-good">{r.shows}</td>
                <td className="py-1.5 text-right font-mono">{r.showRate}%</td>
                <td className="py-1.5 text-right font-mono font-bold text-good">${r.cashCollected.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
