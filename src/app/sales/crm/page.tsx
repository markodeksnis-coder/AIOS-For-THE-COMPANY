import Link from "next/link";
import { db } from "@/lib/db";
import { CrmBoard, type LeadRow } from "@/components/crm/crm-board";
import { PipelineStatsRail, type TodayStats, type RailQueueItem } from "@/components/crm/pipeline-stats-rail";
import { formatCET } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const [leads, unmatchedCount] = await Promise.all([
    db.lead.findMany({ orderBy: { order: "asc" }, include: { calls: true } }),
    db.unmatchedCall.count(),
  ]);

  const leadRows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    stage: l.stage,
    dealValue: l.dealValue,
    nextCallAt: l.nextCallAt ? l.nextCallAt.toISOString() : null,
    stageChangedAt: l.stageChangedAt.toISOString(),
  }));

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 86_400_000);
  const todayStr = startOfToday.toISOString().slice(0, 10);

  const todaysCalls = leads.flatMap((l) => l.calls).filter((c) => c.scheduledAt === todayStr);
  const conducted = todaysCalls.filter((c) => c.callStatus === "showed");
  const closedWon = conducted.filter((c) => c.result === "closed_won");
  const todayStats: TodayStats = {
    booked: todaysCalls.length,
    conducted: conducted.length,
    showRate: todaysCalls.length > 0 ? Math.round((conducted.length / todaysCalls.length) * 100) : 0,
    closeRate: conducted.length > 0 ? Math.round((closedWon.length / conducted.length) * 100) : 0,
    cash: todaysCalls.reduce((sum, c) => sum + (c.cashCollected ?? 0), 0),
  };

  const confirmedToday: RailQueueItem[] = leads
    .filter((l) => l.nextCallAt && l.nextCallAt >= startOfToday && l.nextCallAt < startOfTomorrow)
    .sort((a, b) => (a.nextCallAt as Date).getTime() - (b.nextCallAt as Date).getTime())
    .map((l) => ({ id: l.id, label: `${formatCET(l.nextCallAt as Date)} — ${l.name}` }));

  const reactivation: RailQueueItem[] = leads
    .filter((l) => safeTags(l.tags).some((t) => /react|old lead/i.test(t)))
    .map((l) => ({ id: l.id, label: l.name }));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
            Sales · Inside Sales
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Pipeline</h1>
          <p className="mt-1 max-w-[60ch] text-[0.88rem] text-text-dim">
            One pipeline, Booked to Cash — everything built around show rate and close rate.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/sales/crm/dashboard"
            className="rounded-lg bg-accent px-3 py-2 text-[0.78rem] font-semibold text-on-accent transition-colors hover:bg-accent-strong"
          >
            Dashboard →
          </Link>
          <Link
            href="/sales/crm/follow-ups"
            className="rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
          >
            Follow-ups →
          </Link>
          <Link
            href="/sales/crm/leads"
            className="rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
          >
            Leads →
          </Link>
          <Link
            href="/sales/crm/debriefs"
            className="rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
          >
            Call debriefs →
          </Link>
          <Link
            href="/sales/crm/calls"
            className="rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
          >
            All calls →
          </Link>
          <Link
            href="/sales/crm/unmatched"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
          >
            Unmatched calls →
            {unmatchedCount > 0 && (
              <span className="rounded-full bg-critical px-1.5 py-0.5 font-mono text-[0.62rem] font-bold text-white">
                {unmatchedCount}
              </span>
            )}
          </Link>
          <Link
            href="/sales/crm/webhooks"
            className="rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
          >
            Webhooks →
          </Link>
        </div>
      </div>

      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <CrmBoard leads={leadRows} />
        </div>
        <PipelineStatsRail stats={todayStats} confirmedToday={confirmedToday} reactivation={reactivation} />
      </div>
    </div>
  );
}

function safeTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
