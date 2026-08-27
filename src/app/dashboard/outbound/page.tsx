import type { OutreachLog } from "@prisma/client";
import { db } from "@/lib/db";
import { DashboardTabs } from "@/components/outreach/dashboard-tabs";
import { FilterBar } from "@/components/outreach/filter-bar";
import { GroupTabs } from "@/components/outreach/group-tabs";
import { OutreachLogForm } from "@/components/outreach/outreach-log-form";
import { OutreachChart } from "@/components/outreach/outreach-chart";
import { StatTile, BreakdownTable } from "@/components/outreach/breakdown-table";
import { DetailRail } from "@/components/outreach/detail-rail";
import { SETTERS, SOURCES, sumOutreach, groupTotals, dailySeries, type GroupTotals } from "@/lib/outreach";
import { readParams, hrefWith, sinceFor, parseDrill, type RawSearchParams } from "@/lib/outreach-url";

export const dynamic = "force-dynamic";

const BASE = "/dashboard/outbound";

export default async function ColdOutboundPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = readParams(await searchParams);
  const since = sinceFor(params.range);

  const rows = await db.outreachLog.findMany({
    where: {
      ...(since ? { date: { gte: since } } : {}),
      ...(params.setter !== "all" ? { setter: params.setter } : {}),
      ...(params.source !== "all" ? { source: params.source } : {}),
    },
    orderBy: { date: "desc" },
  });

  const totals = sumOutreach(rows);
  const series = dailySeries(rows, "dmsSent", "repliesReceived");
  const drill = parseDrill(params.drill);
  const drillRows = drill
    ? rows.filter((r) => (drill.field === "id" ? r.id === drill.key : r[drill.field] === drill.key))
    : [];
  const rangeLabel = params.range === "all" ? "all-time" : `last ${params.range} days`;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-6">
          <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">Company · Dashboard</div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Cold Outbound</h1>
          <p className="mt-1 max-w-[78ch] text-[0.88rem] text-text-dim">
            DMs, replies, and members joined — logged by hand per setter and source (no Skool/LinkedIn/Instagram
            integration exists yet). Group the table below by setter, source, or day, and click any row to see the
            logged rows behind it.
          </p>
        </div>

        <DashboardTabs active="/dashboard/outbound" />
        <FilterBar basePath={BASE} params={params} setters={SETTERS} sources={SOURCES} />

        <section className="mb-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="DMs sent" value={totals.dmsSent.toLocaleString()} sub={rangeLabel} />
            <StatTile
              label="Messages seen"
              value={totals.dmsSent > 0 && totals.messagesSeen === 0 ? "—" : totals.messagesSeen.toLocaleString()}
              sub={totals.messagesSeen > 0 ? `${totals.seenRate}% seen rate` : "Log it at check-in"}
              pending={totals.dmsSent > 0 && totals.messagesSeen === 0}
            />
            <StatTile label="Replies" value={String(totals.repliesReceived)} sub="Posts & DMs replied to" />
            <StatTile label="Reply rate" value={`${totals.replyRate}%`} sub="Replies / DMs sent" good />
            <StatTile
              label="Positive replies"
              value={String(totals.positiveReplies)}
              sub={`${totals.positiveRate}% of DMs sent`}
            />
            <StatTile
              label="Members joined"
              value={String(totals.membersJoined)}
              sub={`${totals.joinRate}% of positive replies`}
              good
            />
          </div>
        </section>

        <section className="mb-8">
          <OutreachChart
            title={`DMs sent & replies — ${rangeLabel}`}
            points={series}
            primaryLabel="DMs sent"
            secondaryLabel="replies"
          />
        </section>

        <section className="mb-8">
          <h2 className="mb-3 flex flex-wrap items-center gap-3 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
            <span>{params.group === "rows" ? `All activity (${rows.length})` : `By ${params.group}`}</span>
            <span className="h-px flex-1 bg-border" />
            <GroupTabs basePath={BASE} params={params} rowsLabel="All activity" />
          </h2>

          {params.group === "rows" ? (
            <BreakdownTable<OutreachLog>
              rows={rows.slice(0, 100)}
              keyFor={(r) => r.id}
              hrefFor={(r) => hrefWith(BASE, params, { drill: `id:${r.id}` })}
              activeKey={drill?.field === "id" ? drill.key : null}
              empty="No outreach logged yet for this filter."
              footNote="One row per date × setter × source, exactly as logged. Newest first, 100 max."
              columns={[
                { label: "Date", mono: true, cell: (r) => r.date },
                { label: "Setter", strong: true, cell: (r) => r.setter },
                { label: "Source", cell: (r) => r.source },
                { label: "DMs sent", align: "right", mono: true, cell: (r) => r.dmsSent },
                { label: "Seen", align: "right", mono: true, cell: (r) => (r.messagesSeen > 0 ? r.messagesSeen : "—") },
                { label: "Replies", align: "right", mono: true, cell: (r) => r.repliesReceived },
                { label: "Positive", align: "right", mono: true, cell: (r) => r.positiveReplies },
                { label: "Members joined", align: "right", mono: true, good: true, cell: (r) => r.membersJoined },
              ]}
            />
          ) : (
            <BreakdownTable<GroupTotals>
              rows={groupTotals(rows, params.group)}
              keyFor={(r) => r.key}
              hrefFor={(r) => hrefWith(BASE, params, { drill: `${params.group}:${r.key}` })}
              activeKey={drill ? drill.key : null}
              empty="No outreach logged yet for this filter."
              footNote="Aggregated with sumOutreach() over the filtered OutreachLog rows."
              columns={[
                {
                  label: params.group === "day" ? "Date" : params.group === "setter" ? "Setter" : "Source",
                  strong: true,
                  mono: params.group === "day",
                  cell: (r) => r.key,
                },
                { label: "DMs sent", align: "right", mono: true, cell: (r) => r.dmsSent.toLocaleString() },
                { label: "Seen %", align: "right", mono: true, cell: (r) => (r.messagesSeen > 0 ? `${r.seenRate}%` : "—") },
                { label: "Replies", align: "right", mono: true, cell: (r) => r.repliesReceived },
                { label: "Reply %", align: "right", mono: true, cell: (r) => `${r.replyRate}%` },
                { label: "Positive", align: "right", mono: true, cell: (r) => r.positiveReplies },
                { label: "Members joined", align: "right", mono: true, good: true, cell: (r) => r.membersJoined },
              ]}
            />
          )}
        </section>

        <section>
          <h2 className="mb-3 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
            Log a day&apos;s numbers
          </h2>
          <OutreachLogForm />
        </section>
      </div>

      {drill && drillRows.length > 0 && (
        <DetailRail basePath={BASE} params={params} drill={drill} rows={drillRows} />
      )}
    </div>
  );
}
