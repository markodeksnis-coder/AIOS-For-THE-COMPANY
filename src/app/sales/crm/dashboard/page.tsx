import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { IntegrationStatus } from "@/components/crm/integration-status";
import { DashboardPeriodTabs, type PeriodMetrics } from "@/components/crm/dashboard-period-tabs";
import { CallsCashChart } from "@/components/crm/calls-cash-chart";
import { formatCET } from "@/lib/crm";

const SETUP_DOCS_BASE_URL = "https://github.com/markodeksnis-coder/AIOS-For-THE-COMPANY/blob/main";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [leads, fathomCallCount, calendlyLeadCount] = await Promise.all([
    db.lead.findMany({ orderBy: { order: "asc" }, include: { calls: true } }),
    db.salesCall.count({ where: { fathomRecordingId: { not: null } } }),
    db.lead.count({ where: { calendlyEventUri: { not: null } } }),
  ]);

  const allCalls = leads.flatMap((l) => l.calls);

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
    const booked = inRange.length;
    const conducted = inRange.filter((c) => c.callStatus === "showed").length;
    const closedWon = inRange.filter((c) => c.result === "closed_won").length;
    const cash = inRange.reduce((sum, c) => sum + (c.cashCollected ?? 0), 0);
    return {
      booked,
      conducted,
      showRate: booked > 0 ? Math.round((conducted / booked) * 100) : 0,
      closeRate: conducted > 0 ? Math.round((closedWon / conducted) * 100) : 0,
      cash,
    };
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

  const callsBySource = leads.flatMap((l) => l.calls.map((c) => ({ key: l.source ?? "(no source)", ...c })));
  const callsByRep = allCalls.map((c) => ({ key: c.rep ?? "(unassigned)", ...c }));

  const latestCall = (l: (typeof leads)[number]) => [...l.calls].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0];
  const todaysNoShows = leads.filter((l) => l.stage === "no_show" && latestCall(l)?.scheduledAt === todayStr);
  const weeksClosedLost = leads.filter(
    (l) => l.stage === "closed_lost" && (latestCall(l)?.scheduledAt ?? "") >= weekAgoStr
  );
  const reactivationLeads = leads.filter((l) => {
    const tags = safeTags(l.tags);
    return tags.some((t) => /react|old lead/i.test(t));
  });
  const freshLeads = [...leads.filter((l) => l.stage === "new_lead")]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);
  const todaysConfirmedCalls = [...leads]
    .filter((l) => l.nextCallAt && l.nextCallAt >= startOfToday && l.nextCallAt < new Date(startOfToday.getTime() + 86_400_000))
    .sort((a, b) => (a.nextCallAt as Date).getTime() - (b.nextCallAt as Date).getTime());

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">Sales · Inside Sales</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Dashboard</h1>
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

      <div className="mb-6">
        <DashboardPeriodTabs today={periodData.today} week={periodData.week} month={periodData.month} />
      </div>

      <div className="mb-6">
        <CallsCashChart points={chartPoints} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownTable title="Pipeline by source" rows={breakdownRows(callsBySource)} />
        <BreakdownTable title="By rep" rows={breakdownRows(callsByRep)} />
      </div>
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
    const groupShowed = group.filter((c) => c.callStatus === "showed");
    const groupNoShows = group.filter((c) => c.callStatus === "no_show");
    const groupWon = group.filter((c) => c.result === "closed_won");
    const groupAttempted = groupShowed.length + groupNoShows.length;
    const cash = group.reduce((sum, c) => sum + (c.cashCollected ?? 0), 0);
    return {
      key,
      calls: group.length,
      showRate: groupAttempted > 0 ? Math.round((groupShowed.length / groupAttempted) * 100) : 0,
      closeRate: groupShowed.length > 0 ? Math.round((groupWon.length / groupShowed.length) * 100) : 0,
      cash,
    };
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
