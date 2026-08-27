import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { IntegrationStatus } from "@/components/crm/integration-status";
import { DashboardPeriodTabs, type PeriodMetrics } from "@/components/crm/dashboard-period-tabs";
import { CallsCashChart } from "@/components/crm/calls-cash-chart";
import { formatCET, computeCallMetrics } from "@/lib/crm";

const SETUP_DOCS_BASE_URL = "https://github.com/markodeksnis-coder/AIOS-For-THE-COMPANY/blob/main";

export const dynamic = "force-dynamic";

// Everything on this page that's actually date-bound (the today/week/month
// tabs, the 30-day chart, today's/this-week's queues, the source/rep
// breakdown tables) only ever looks at recent calls — but this used to
// fetch every SalesCall ever logged for every lead (`include: { calls: true
// }`, unbounded), on every page load. Leads themselves stay unscoped
// (reactivationLeads specifically needs to find OLD, inactive leads, and
// freshLeads sorts by the lead's own createdAt) — only the call join is
// bounded. ?range=all is the explicit widen-it escape hatch.
const DEFAULT_RANGE_DAYS = 90;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const showAllCalls = range === "all";
  const callsSinceStr = new Date(Date.now() - DEFAULT_RANGE_DAYS * 86_400_000).toISOString().slice(0, 10);

  const [leads, allCalls, fathomCallCount, calendlyLeadCount] = await Promise.all([
    db.lead.findMany({ orderBy: { order: "asc" } }),
    db.salesCall.findMany({ where: showAllCalls ? undefined : { scheduledAt: { gte: callsSinceStr } } }),
    db.salesCall.count({ where: { fathomRecordingId: { not: null } } }),
    db.lead.count({ where: { calendlyEventUri: { not: null } } }),
  ]);

  const callsByLeadId = new Map<string, typeof allCalls>();
  for (const call of allCalls) {
    const bucket = callsByLeadId.get(call.leadId);
    if (bucket) bucket.push(call);
    else callsByLeadId.set(call.leadId, [call]);
  }
  const leadById = new Map(leads.map((l) => [l.id, l]));

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const dateStr = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + n);
    return copy;
  };
  // Calendar-aware "one month back" — clamps to the shorter month's last
  // day (e.g. Mar 31 -> Feb 28) instead of overflowing into March.
  const shiftMonth = (d: Date, delta: number) => {
    const targetMonth = d.getMonth() + delta;
    const daysInTargetMonth = new Date(d.getFullYear(), targetMonth + 1, 0).getDate();
    return new Date(d.getFullYear(), targetMonth, Math.min(d.getDate(), daysInTargetMonth));
  };

  const todayStr = dateStr(now);
  const weekAgoStr = dateStr(startOfWeek);

  function periodMetrics(startStr: string, endStr: string): PeriodMetrics {
    const inRange = allCalls.filter((c) => c.scheduledAt >= startStr && c.scheduledAt <= endStr);
    return computeCallMetrics(inRange);
  }

  // Each tab compares against the immediately preceding period of the same
  // length (yesterday; last week up to the same weekday; last month up to
  // the same day-of-month) rather than the previous period in full —
  // comparing a partial "this week so far" against a complete prior week
  // would read as a manufactured drop every single day except Sunday.
  const prevDay = addDays(startOfToday, -1);
  const prevWeekStart = addDays(startOfWeek, -7);
  const prevWeekEnd = addDays(now, -7);
  const prevMonthStart = shiftMonth(startOfMonth, -1);
  const prevMonthEnd = shiftMonth(now, -1);

  const periodData = {
    today: {
      current: periodMetrics(todayStr, todayStr),
      previous: periodMetrics(dateStr(prevDay), dateStr(prevDay)),
    },
    week: {
      current: periodMetrics(weekAgoStr, todayStr),
      previous: periodMetrics(dateStr(prevWeekStart), dateStr(prevWeekEnd)),
    },
    month: {
      current: periodMetrics(dateStr(startOfMonth), todayStr),
      previous: periodMetrics(dateStr(prevMonthStart), dateStr(prevMonthEnd)),
    },
  };

  // One line chart, calls conducted + cash collected per day, last 30 days.
  const CHART_DAYS = 30;
  const chartPoints = Array.from({ length: CHART_DAYS }, (_, i) => {
    const dStr = dateStr(addDays(startOfToday, i - (CHART_DAYS - 1)));
    const dayCalls = allCalls.filter((c) => c.scheduledAt === dStr);
    return {
      date: dStr,
      conducted: dayCalls.filter((c) => c.callStatus === "showed").length,
      cash: dayCalls.reduce((sum, c) => sum + (c.cashCollected ?? 0), 0),
    };
  });

  const callsBySource = allCalls.map((c) => ({ key: leadById.get(c.leadId)?.source ?? "(no source)", ...c }));
  const callsByRep = allCalls.map((c) => ({ key: c.rep ?? "(unassigned)", ...c }));

  const latestCall = (l: (typeof leads)[number]) =>
    [...(callsByLeadId.get(l.id) ?? [])].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0];
  const todaysNoShows = leads.filter((l) => l.stage === "no_show" && latestCall(l)?.scheduledAt === todayStr);
  const weeksClosedLost = leads.filter(
    (l) => l.stage === "closed_lost" && (latestCall(l)?.scheduledAt ?? "") >= weekAgoStr
  );
  const reactivationLeads = leads.filter((l) => {
    const tags = safeTags(l.tags);
    return tags.some((t) => /react|old lead/i.test(t));
  });
  // "Fresh" now means booked but nothing on the calendar yet — there's no
  // separate "new lead" stage to check since Booked covers both a brand
  // new lead and one with a call actually scheduled.
  const freshLeads = [...leads.filter((l) => l.stage === "booked" && !l.nextCallAt)]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);
  const todaysConfirmedCalls = [...leads]
    .filter((l) => l.nextCallAt && l.nextCallAt >= startOfToday && l.nextCallAt < new Date(startOfToday.getTime() + 86_400_000))
    .sort((a, b) => (a.nextCallAt as Date).getTime() - (b.nextCallAt as Date).getTime());

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">Sales · Inside Sales</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Sales KPI</h1>
        <p className="mt-1 max-w-[65ch] text-[0.88rem] text-text-dim">
          Show rate, close rate, and cash collected — plus the queues worth checking today.
        </p>
        <Link href="/sales/crm" className="mt-2 inline-block text-[0.78rem] font-semibold text-accent-strong">
          ← Back to Pipeline
        </Link>
      </div>

      <IntegrationStatus
        fathomConfigured={!!process.env.FATHOM_WEBHOOK_SIGNING_KEY}
        fathomCallCount={fathomCallCount}
        calendlyConfigured={!!process.env.CALENDLY_WEBHOOK_SIGNING_KEY}
        calendlyLeadCount={calendlyLeadCount}
        setupDocsBaseUrl={SETUP_DOCS_BASE_URL}
      />

      <Section title="Performance">
        <div className="mb-5">
          <DashboardPeriodTabs today={periodData.today} week={periodData.week} month={periodData.month} />
        </div>
        <CallsCashChart points={chartPoints} />
      </Section>

      <Section title="Action queues">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <QueueCard
            title="Today's confirmed calls"
            rows={todaysConfirmedCalls.map((l) => `${formatCET(l.nextCallAt as Date)} — ${l.name}`)}
            empty="Nothing booked for today yet."
          />
          <QueueCard title="Today's no-shows" rows={todaysNoShows.map((l) => l.name)} empty="None today." />
          <QueueCard title="This week's closed-lost" rows={weeksClosedLost.map((l) => l.name)} empty="None this week." />
          <QueueCard title="Reactivation list" rows={reactivationLeads.map((l) => l.name)} empty="No leads tagged for reactivation." />
          <QueueCard title="Fresh new leads" rows={freshLeads.map((l) => l.name)} empty="No new leads waiting." />
        </div>
      </Section>

      <Section
        title="Breakdowns"
        last
        action={
          <span className="font-mono text-[0.7rem] font-normal normal-case text-text-faint">
            {showAllCalls ? (
              <>
                All-time · <Link href="/sales/crm/dashboard" className="text-accent-strong">Last {DEFAULT_RANGE_DAYS} days</Link>
              </>
            ) : (
              <>
                Last {DEFAULT_RANGE_DAYS} days ·{" "}
                <Link href="/sales/crm/dashboard?range=all" className="text-accent-strong">All-time</Link>
              </>
            )}
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BreakdownTable title="Pipeline by source" rows={breakdownRows(callsBySource)} />
          <BreakdownTable title="By rep" rows={breakdownRows(callsByRep)} />
        </div>
      </Section>
    </div>
  );
}

/** Labeled, visually separated block — the dashboard used to be one long
 *  scroll of stat tiles, a chart, five queue cards, and two tables with no
 *  grouping; this makes each concern its own clearly bounded section. */
function Section({
  title,
  action,
  last = false,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={last ? "" : "mb-8 border-b border-border pb-8"}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function QueueCard({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  return (
    <Card className="p-4">
      <h2 className="mb-2 text-[0.8rem] font-bold">
        {title} <span className="font-mono text-[0.68rem] font-normal text-text-faint">{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-[0.78rem] text-text-faint">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((name, i) => (
            <li key={i} className="text-[0.8rem] text-text-dim">
              {name}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

type KeyedCall = { key: string; callStatus: string; result: string | null; cashCollected: number | null };

function breakdownRows(calls: KeyedCall[]) {
  const grouped = groupBy(calls, (c) => c.key);
  return Object.entries(grouped).map(([key, group]) => {
    const metrics = computeCallMetrics(group);
    return { key, calls: metrics.booked, showRate: metrics.showRate, closeRate: metrics.closeRate, cash: metrics.cash };
  });
}

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; calls: number; showRate: number; closeRate: number; cash: number }[];
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
              <th className="pb-1.5 font-medium">Source</th>
              <th className="pb-1.5 text-right font-medium">Calls</th>
              <th className="pb-1.5 text-right font-medium">Show %</th>
              <th className="pb-1.5 text-right font-medium">Close %</th>
              <th className="pb-1.5 text-right font-medium">Cash</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-border last:border-b-0">
                <td className="py-1.5 font-semibold">{r.key}</td>
                <td className="py-1.5 text-right font-mono">{r.calls}</td>
                <td className="py-1.5 text-right font-mono">{r.showRate}%</td>
                <td className="py-1.5 text-right font-mono">{r.closeRate}%</td>
                <td className="py-1.5 text-right font-mono font-bold text-good">${r.cash.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    (grouped[key] ??= []).push(item);
  }
  return grouped;
}

function safeTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
