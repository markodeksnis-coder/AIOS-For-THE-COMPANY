import Link from "next/link";
import type { OutreachLog } from "@prisma/client";
import { db } from "@/lib/db";
import { DashboardTabs } from "@/components/outreach/dashboard-tabs";
import { FilterBar } from "@/components/outreach/filter-bar";
import { GroupTabs } from "@/components/outreach/group-tabs";
import { OutreachChart } from "@/components/outreach/outreach-chart";
import { StatTile, BreakdownTable } from "@/components/outreach/breakdown-table";
import { DetailRail } from "@/components/outreach/detail-rail";
import { SETTERS, SOURCES, sumOutreach, groupTotals, dailySeries, type GroupTotals } from "@/lib/outreach";
import { readParams, hrefWith, sinceFor, parseDrill, type RawSearchParams } from "@/lib/outreach-url";

export const dynamic = "force-dynamic";

const BASE = "/dashboard/appointments";

export default async function AppointmentReportingPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = readParams(await searchParams);
  const since = sinceFor(params.range);

  const allRows = await db.outreachLog.findMany({
    where: {
      ...(since ? { date: { gte: since } } : {}),
      ...(params.setter !== "all" ? { setter: params.setter } : {}),
      ...(params.source !== "all" ? { source: params.source } : {}),
    },
    orderBy: { date: "desc" },
  });
  // Only rows with something to report — a day/setter/source logged purely
  // for DMs/replies with zero appointment activity shouldn't pad this table.
  const rows = allRows.filter((r) => r.appointmentsBooked > 0 || r.shows > 0 || r.noShows > 0);

  const totals = sumOutreach(allRows);
  const series = dailySeries(allRows, "appointmentsBooked", "shows");
  const drill = parseDrill(params.drill);
  const drillRows = drill
    ? allRows.filter((r) => (drill.field === "id" ? r.id === drill.key : r[drill.field] === drill.key))
    : [];
  const rangeLabel = params.range === "all" ? "all-time" : `last ${params.range} days`;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-6">
          <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">Company · Dashboard</div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Appointment Reporting</h1>
          <p className="mt-1 max-w-[78ch] text-[0.88rem] text-text-dim">
            Appointments booked, shows, and no-shows from cold outbound — the same hand-logged rows as{" "}
            <Link href="/dashboard/outbound" className="text-accent-strong">
              Cold Outbound
            </Link>
            , grouped by outcome instead of by message volume.
          </p>
        </div>

        <DashboardTabs active="/dashboard/appointments" />
        <FilterBar basePath={BASE} params={params} setters={SETTERS} sources={SOURCES} />

        <section className="mb-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile label="Appointments booked" value={String(totals.appointmentsBooked)} sub={rangeLabel} />
            <StatTile label="Shows" value={String(totals.shows)} sub="Closer-recorded" good />
            <StatTile label="No-shows" value={String(totals.noShows)} sub="Recovery owed" />
            <StatTile label="Show rate" value={`${totals.showRate}%`} sub="Shows / attempted" good />
            <StatTile label="Won value" value={`$${totals.cashCollected.toLocaleString()}`} sub="Cash collected" good />
          </div>
        </section>

        <section className="mb-8">
          <OutreachChart
            title={`Appointments booked & shows — ${rangeLabel}`}
            points={series}
            primaryLabel="booked"
            secondaryLabel="shows"
          />
        </section>

        <section>
          <h2 className="mb-3 flex flex-wrap items-center gap-3 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
            <span>{params.group === "rows" ? `Logged days (${rows.length})` : `By ${params.group}`}</span>
            <span className="h-px flex-1 bg-border" />
            <GroupTabs basePath={BASE} params={params} rowsLabel="Logged days" />
          </h2>

          {params.group === "rows" ? (
            <BreakdownTable<OutreachLog>
              rows={rows.slice(0, 100)}
              keyFor={(r) => r.id}
              hrefFor={(r) => hrefWith(BASE, params, { drill: `id:${r.id}` })}
              activeKey={drill?.field === "id" ? drill.key : null}
              empty="No appointment activity logged yet for this filter. Log it from Cold Outbound."
              footNote="Setter and source come from the published appointment read; corrections stay Marketing commands."
              columns={[
                { label: "Date", mono: true, cell: (r) => r.date },
                { label: "Setter", strong: true, cell: (r) => r.setter },
                { label: "Source", cell: (r) => r.source },
                { label: "Booked", align: "right", mono: true, cell: (r) => r.appointmentsBooked },
                { label: "Shows", align: "right", mono: true, good: true, cell: (r) => r.shows },
                { label: "No-shows", align: "right", mono: true, cell: (r) => r.noShows },
                {
                  label: "Cash",
                  align: "right",
                  mono: true,
                  good: true,
                  cell: (r) => `$${r.cashCollected.toLocaleString()}`,
                },
              ]}
            />
          ) : (
            <BreakdownTable<GroupTotals>
              rows={groupTotals(rows, params.group)}
              keyFor={(r) => r.key}
              hrefFor={(r) => hrefWith(BASE, params, { drill: `${params.group}:${r.key}` })}
              activeKey={drill ? drill.key : null}
              empty="No appointment activity logged yet for this filter."
              footNote="Show rate is shows ÷ (shows + no-shows), so a booked call still in the future never counts against a setter."
              columns={[
                {
                  label: params.group === "day" ? "Date" : params.group === "setter" ? "Setter" : "Source",
                  strong: true,
                  mono: params.group === "day",
                  cell: (r) => r.key,
                },
                { label: "Booked", align: "right", mono: true, cell: (r) => r.appointmentsBooked },
                { label: "Shows", align: "right", mono: true, good: true, cell: (r) => r.shows },
                { label: "No-shows", align: "right", mono: true, cell: (r) => r.noShows },
                { label: "Show %", align: "right", mono: true, cell: (r) => `${r.showRate}%` },
                { label: "Members joined", align: "right", mono: true, cell: (r) => r.membersJoined },
                {
                  label: "Cash",
                  align: "right",
                  mono: true,
                  good: true,
                  cell: (r) => `$${r.cashCollected.toLocaleString()}`,
                },
              ]}
            />
          )}
        </section>
      </div>

      {drill && drillRows.length > 0 && (
        <DetailRail basePath={BASE} params={params} drill={drill} rows={drillRows} />
      )}
    </div>
  );
}
