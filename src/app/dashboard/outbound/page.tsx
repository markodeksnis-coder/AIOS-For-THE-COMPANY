import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { DashboardTabs } from "@/components/outreach/dashboard-tabs";
import { FilterBar } from "@/components/outreach/filter-bar";
import { OutreachLogForm } from "@/components/outreach/outreach-log-form";
import { SETTERS, SOURCES, sumOutreach, groupByKey } from "@/lib/outreach";

export const dynamic = "force-dynamic";

export default async function ColdOutboundPage({
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

  const rows = await db.outreachLog.findMany({
    where: {
      ...(since ? { date: { gte: since } } : {}),
      ...(setter !== "all" ? { setter } : {}),
      ...(source !== "all" ? { source } : {}),
    },
    orderBy: { date: "desc" },
  });

  const totals = sumOutreach(rows);
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
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Cold Outbound</h1>
        <p className="mt-1 text-[0.88rem] text-text-dim">
          DMs, replies, and members joined — logged by hand per setter and source (no Skool/LinkedIn/Instagram
          integration exists yet).
        </p>
      </div>

      <DashboardTabs active="/dashboard/outbound" />
      <FilterBar
        basePath="/dashboard/outbound"
        range={range}
        setter={setter}
        source={source}
        setters={SETTERS}
        sources={SOURCES}
      />

      <section className="mb-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="DMs sent" value={String(totals.dmsSent)} />
          <StatTile label="Replies" value={String(totals.repliesReceived)} />
          <StatTile label="Reply rate" value={`${totals.replyRate}%`} good />
          <StatTile label="Positive replies" value={String(totals.positiveReplies)} />
          <StatTile label="Positive rate" value={`${totals.positiveRate}%`} good />
          <StatTile label="Members joined" value={String(totals.membersJoined)} good />
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OutboundTable title="By setter" rows={bySetter} />
        <OutboundTable title="By source" rows={bySource} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
          Log a day&apos;s numbers
        </h2>
        <OutreachLogForm />
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
          All activity ({rows.length})
        </h2>
        <Card className="overflow-x-auto p-4">
          {rows.length === 0 ? (
            <p className="text-[0.8rem] text-text-faint">No outreach logged yet for this filter.</p>
          ) : (
            <table className="w-full text-[0.78rem]">
              <thead>
                <tr className="border-b border-border text-left text-text-faint">
                  <th className="pb-1.5 font-medium">Date</th>
                  <th className="pb-1.5 font-medium">Setter</th>
                  <th className="pb-1.5 font-medium">Source</th>
                  <th className="pb-1.5 text-right font-medium">DMs sent</th>
                  <th className="pb-1.5 text-right font-medium">Replies</th>
                  <th className="pb-1.5 text-right font-medium">Positive</th>
                  <th className="pb-1.5 text-right font-medium">Members joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0">
                    <td className="py-1.5 font-mono text-text-faint">{r.date}</td>
                    <td className="py-1.5 font-semibold">{r.setter}</td>
                    <td className="py-1.5">{r.source}</td>
                    <td className="py-1.5 text-right font-mono">{r.dmsSent}</td>
                    <td className="py-1.5 text-right font-mono">{r.repliesReceived}</td>
                    <td className="py-1.5 text-right font-mono">{r.positiveReplies}</td>
                    <td className="py-1.5 text-right font-mono font-bold text-good">{r.membersJoined}</td>
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

function OutboundTable({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; dmsSent: number; repliesReceived: number; positiveReplies: number; replyRate: number; membersJoined: number }[];
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
              <th className="pb-1.5 text-right font-medium">DMs sent</th>
              <th className="pb-1.5 text-right font-medium">Replies</th>
              <th className="pb-1.5 text-right font-medium">Reply %</th>
              <th className="pb-1.5 text-right font-medium">Members joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-border last:border-b-0">
                <td className="py-1.5 font-semibold">{r.key}</td>
                <td className="py-1.5 text-right font-mono">{r.dmsSent}</td>
                <td className="py-1.5 text-right font-mono">{r.repliesReceived}</td>
                <td className="py-1.5 text-right font-mono">{r.replyRate}%</td>
                <td className="py-1.5 text-right font-mono font-bold text-good">{r.membersJoined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
