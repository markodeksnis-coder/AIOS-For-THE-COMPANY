import Link from "next/link";
import { db } from "@/lib/db";
import { DashboardTabs } from "@/components/outreach/dashboard-tabs";
import { StatTile, BreakdownTable } from "@/components/outreach/breakdown-table";
import { OutreachChart } from "@/components/outreach/outreach-chart";
import { computeCallMetrics } from "@/lib/crm";
import { sumOutreach, groupTotals, dailySeries, type GroupTotals } from "@/lib/outreach";

export const dynamic = "force-dynamic";

/** Overview: today's numbers up top (the question "how are we doing right
 *  now"), then a 30-day trend and a per-setter rollup so a bad today can be
 *  read against the trend instead of in isolation. Deliberately no filters
 *  here — filtering lives on the two detail tabs; this one is always
 *  "everything, today". */
export default async function DashboardPage() {
  const now = new Date();
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  const since = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);

  const [todaysCalls, todaysOutreach, trailing] = await Promise.all([
    db.salesCall.findMany({ where: { scheduledAt: todayStr } }),
    db.outreachLog.findMany({ where: { date: todayStr } }),
    db.outreachLog.findMany({ where: { date: { gte: since } }, orderBy: { date: "asc" } }),
  ]);

  const callStats = computeCallMetrics(todaysCalls);
  const today = sumOutreach(todaysOutreach);
  const month = sumOutreach(trailing);
  const bySetter = groupTotals(trailing, "setter");
  const series = dailySeries(trailing, "dmsSent", "membersJoined");

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">Company · Dashboard</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="mt-1 max-w-[78ch] text-[0.88rem] text-text-dim">
          Everything that matters, today — calls straight from the CRM, outreach logged by hand at the daily check-in.
          Drill into any of it from{" "}
          <Link href="/dashboard/outbound" className="text-accent-strong">
            Cold Outbound
          </Link>{" "}
          or{" "}
          <Link href="/dashboard/appointments" className="text-accent-strong">
            Appointment Reporting
          </Link>
          .
        </p>
      </div>

      <DashboardTabs active="/dashboard" />

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
          Today
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile
            label="Members joined"
            value={String(today.membersJoined)}
            sub={`${today.joinRate}% of positive replies`}
            good
          />
          <StatTile
            label="Sales calls taken"
            value={String(callStats.conducted)}
            sub={`${callStats.booked} booked · ${callStats.showRate}% show`}
          />
          <StatTile label="DMs sent" value={String(today.dmsSent)} sub={`${today.replyRate}% reply rate`} />
          <StatTile
            label="Messages seen"
            value={today.dmsSent > 0 && today.messagesSeen === 0 ? "—" : String(today.messagesSeen)}
            sub={today.messagesSeen > 0 ? `${today.seenRate}% seen rate` : "Log it at check-in"}
            pending={today.dmsSent > 0 && today.messagesSeen === 0}
          />
          <StatTile
            label="Posts replied to"
            value={String(today.repliesReceived)}
            sub={`${today.positiveReplies} positive`}
          />
          <StatTile
            label="Cash collected"
            value={`$${(today.cashCollected + callStats.cash).toLocaleString()}`}
            sub={`${callStats.closeRate}% close rate`}
            good
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
          Last 30 days
        </h2>
        <OutreachChart
          title="DMs sent & members joined — last 30 days"
          points={series}
          primaryLabel="DMs sent"
          secondaryLabel="members joined"
        />
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
          Team rollup (last 30 days)
        </h2>
        <BreakdownTable<GroupTotals>
          rows={bySetter}
          keyFor={(r) => r.key}
          hrefFor={(r) => `/dashboard/outbound?group=setter&drill=setter:${encodeURIComponent(r.key)}`}
          empty="No outreach logged in the last 30 days."
          footNote={`Sales-call numbers come from SalesCall via computeCallMetrics(); everything else from OutreachLog. Period total: ${month.dmsSent.toLocaleString()} DMs, ${month.membersJoined} members joined.`}
          columns={[
            { label: "Setter", strong: true, cell: (r) => r.key },
            { label: "DMs sent", align: "right", mono: true, cell: (r) => r.dmsSent.toLocaleString() },
            { label: "Replies", align: "right", mono: true, cell: (r) => r.repliesReceived },
            { label: "Reply %", align: "right", mono: true, cell: (r) => `${r.replyRate}%` },
            { label: "Members", align: "right", mono: true, good: true, cell: (r) => r.membersJoined },
            { label: "Booked", align: "right", mono: true, cell: (r) => r.appointmentsBooked },
            {
              label: "Cash",
              align: "right",
              mono: true,
              good: true,
              cell: (r) => `$${r.cashCollected.toLocaleString()}`,
            },
          ]}
        />
      </section>
    </div>
  );
}
