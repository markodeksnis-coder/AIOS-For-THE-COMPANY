import Link from "next/link";
import { Phone, Eye, Trophy, DollarSign, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/icon-tile";
import { CrmBoard, type LeadRow } from "@/components/crm/crm-board";
import { LEAD_STAGE_LABELS, LEAD_STAGE_STYLE, formatCET } from "@/lib/crm";

export const dynamic = "force-dynamic";

const SHOWED_OUTCOMES = new Set(["booked_2nd_call", "pif", "plan", "no_money", "not_a_fit"]);
const WON_OUTCOMES = new Set(["pif", "plan"]);
const OPEN_STAGES = new Set(["new_lead", "booked_unconfirmed", "confirmed", "showed"]);

export default async function CrmPage() {
  const leads = await db.lead.findMany({
    orderBy: { order: "asc" },
    include: { calls: true },
  });

  const allCalls = leads.flatMap((l) => l.calls);
  const showed = allCalls.filter((c) => SHOWED_OUTCOMES.has(c.outcome));
  const noShows = allCalls.filter((c) => c.outcome === "no_show");
  const won = allCalls.filter((c) => WON_OUTCOMES.has(c.outcome));
  const attempted = showed.length + noShows.length; // excludes canceled — never really attempted
  const showRate = attempted > 0 ? Math.round((showed.length / attempted) * 100) : 0;
  const closeRate = showed.length > 0 ? Math.round((won.length / showed.length) * 100) : 0;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const cashSince = (since: Date) =>
    allCalls.filter((c) => c.createdAt >= since).reduce((sum, c) => sum + (c.cashCollected ?? 0), 0);
  const cashToday = cashSince(startOfToday);
  const cashWeek = cashSince(startOfWeek);
  const cashMonth = cashSince(startOfMonth);
  const cashAllTime = allCalls.reduce((sum, c) => sum + (c.cashCollected ?? 0), 0);
  const revenuePerShow = showed.length > 0 ? Math.round(cashAllTime / showed.length) : 0;
  const revenuePerBooked = attempted > 0 ? Math.round(cashAllTime / attempted) : 0;

  const callsSince = (since: Date) => allCalls.filter((c) => c.createdAt >= since).length;
  const callsToday = callsSince(startOfToday);
  const callsWeek = callsSince(startOfWeek);
  const callsMonth = callsSince(startOfMonth);
  const oldestCallAt = allCalls.reduce<Date | null>(
    (min, c) => (min === null || c.createdAt < min ? c.createdAt : min),
    null
  );
  const daysTracked = oldestCallAt
    ? Math.max(1, Math.ceil((now.getTime() - oldestCallAt.getTime()) / 86_400_000))
    : 1;
  const dailyAverage = Math.round((allCalls.length / daysTracked) * 10) / 10;

  const callsBySource = leads.flatMap((l) => l.calls.map((c) => ({ key: l.source ?? "(no source)", ...c })));
  const callsByRep = allCalls.map((c) => ({ key: c.rep ?? "(unassigned)", ...c }));

  const evLeads = leads
    .filter((l) => OPEN_STAGES.has(l.stage) && l.dealValue && l.stageProbability)
    .map((l) => ({ ...l, ev: Math.round((l.dealValue ?? 0) * ((l.stageProbability ?? 0) / 100)) }))
    .sort((a, b) => b.ev - a.ev)
    .slice(0, 5);

  const todayStr = now.toISOString().slice(0, 10);
  const weekAgoStr = startOfWeek.toISOString().slice(0, 10);
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

  const leadRows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    source: l.source,
    repName: l.repName,
    stage: l.stage,
    tags: l.tags,
    dealValue: l.dealValue,
    stageProbability: l.stageProbability,
    cashCollected: l.cashCollected,
    noShowCount: l.calls.filter((c) => c.outcome === "no_show").length,
    nextCallAt: l.nextCallAt ? l.nextCallAt.toISOString() : null,
  }));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
            Sales · Inside Sales
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">CRM</h1>
          <p className="mt-1 max-w-[60ch] text-[0.88rem] text-text-dim">
            One pipeline, Booked to Cash — everything built around show rate and close rate.
          </p>
        </div>
        <Link
          href="/sales/crm/calls"
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
        >
          All calls →
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Phone} gradient="linear-gradient(135deg, #3B82F6, #14B8A6)" value={allCalls.length} label="Total calls" />
        <StatTile icon={Eye} gradient="linear-gradient(135deg, #8B5CF6, #A78BFA)" value={`${showRate}%`} label="Show rate" />
        <StatTile icon={Trophy} gradient="linear-gradient(135deg, #22C55E, #4ADE80)" value={`${closeRate}%`} label="Close rate" />
        <StatTile
          icon={DollarSign}
          gradient="linear-gradient(135deg, #EAB308, #FACC15)"
          value={`$${cashAllTime.toLocaleString()}`}
          label="Cash collected (all-time)"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-[0.8rem] font-bold">Cash collected</h2>
          <div className="grid grid-cols-3 gap-3">
            <CashCell label="Today" value={cashToday} />
            <CashCell label="This week" value={cashWeek} />
            <CashCell label="This month" value={cashMonth} />
            <CashCell label="Per show" value={revenuePerShow} />
            <CashCell label="Per booked call" value={revenuePerBooked} />
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-[0.8rem] font-bold">Calls</h2>
          <div className="grid grid-cols-3 gap-3">
            <CountCell label="Today" value={callsToday} />
            <CountCell label="This week" value={callsWeek} />
            <CountCell label="This month" value={callsMonth} />
            <CountCell label="Daily average" value={dailyAverage} />
            <CountCell label="All-time" value={allCalls.length} />
          </div>
        </Card>
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

      <Card className="mb-6 overflow-x-auto p-4">
        <h2 className="mb-3 text-[0.8rem] font-bold">Top 5 open deals by expected value</h2>
        <p className="mb-3 text-[0.76rem] text-text-dim">Deal value × stage probability. Set both on a lead to rank it.</p>
        {evLeads.length === 0 ? (
          <p className="text-[0.8rem] text-text-faint">
            No open leads have both a deal value and a stage probability set yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {evLeads.map((l, i) => (
              <Link
                key={l.id}
                href={`/sales/crm/${l.id}`}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:border-accent hover:bg-surface-hover"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-wash font-mono text-[0.68rem] font-bold text-accent-strong">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-[0.83rem] font-bold">{l.name}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold"
                  style={{
                    backgroundColor: LEAD_STAGE_STYLE[l.stage as keyof typeof LEAD_STAGE_STYLE]?.wash,
                    color: LEAD_STAGE_STYLE[l.stage as keyof typeof LEAD_STAGE_STYLE]?.text,
                  }}
                >
                  {LEAD_STAGE_LABELS[l.stage as keyof typeof LEAD_STAGE_LABELS] ?? l.stage}
                </span>
                <span className="font-mono text-[0.78rem] font-bold text-accent-strong">${l.ev.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownTable title="Pipeline by source" rows={breakdownRows(callsBySource)} />
        <BreakdownTable title="By rep" rows={breakdownRows(callsByRep)} />
      </div>

      <CrmBoard leads={leadRows} />
    </div>
  );
}

function StatTile({
  icon,
  gradient,
  value,
  label,
}: {
  icon: LucideIcon;
  gradient: string;
  value: string | number;
  label: string;
}) {
  return (
    <Card className="h-full p-4">
      <IconTile icon={icon} gradient={gradient} size="sm" className="mb-2.5" />
      <div className="font-mono text-2xl tabular-nums">{value}</div>
      <div className="mt-0.5 text-[0.78rem] text-text-dim">{label}</div>
    </Card>
  );
}

function CashCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-mono text-lg font-bold tabular-nums text-good">${value.toLocaleString()}</div>
      <div className="text-[0.7rem] text-text-faint">{label}</div>
    </div>
  );
}

function CountCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-mono text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[0.7rem] text-text-faint">{label}</div>
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

type KeyedCall = { key: string; outcome: string; cashCollected: number | null };

function breakdownRows(calls: KeyedCall[]) {
  const grouped = groupBy(calls, (c) => c.key);
  return Object.entries(grouped).map(([key, group]) => {
    const groupShowed = group.filter((c) => SHOWED_OUTCOMES.has(c.outcome));
    const groupNoShows = group.filter((c) => c.outcome === "no_show");
    const groupWon = group.filter((c) => WON_OUTCOMES.has(c.outcome));
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

