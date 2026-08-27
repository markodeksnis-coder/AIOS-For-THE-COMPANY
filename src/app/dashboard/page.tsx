import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/scorecards/kpi-card";
import { computeCallMetrics } from "@/lib/crm";
import type { DeptKpi } from "@/lib/scorecards";

export const dynamic = "force-dynamic";

// The manual numbers here (nothing in this app captures them automatically —
// no DM/Skool integration exists) are logged the same way every other
// hand-tracked number in this app is: through addScorecardEntry, reusing
// KpiCard exactly as /scorecards does. "outreach" isn't a real department —
// it's just a ScorecardEntry.department value (a plain string, no schema
// change needed) so these don't show up mixed into the per-department
// Scorecards page.
const OUTREACH_DEPARTMENT = "outreach";
const OUTREACH_KPIS: DeptKpi[] = [
  { name: "DMs sent", target: "Log daily" },
  { name: "Positive replies", target: "Log daily" },
  { name: "Messages sent", target: "Log daily" },
  { name: "Skool members joined", target: "Log daily" },
];

export default async function DashboardPage() {
  const now = new Date();
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);

  const [todaysCalls, outreachEntries] = await Promise.all([
    db.salesCall.findMany({ where: { scheduledAt: todayStr } }),
    db.scorecardEntry.findMany({ where: { department: OUTREACH_DEPARTMENT } }),
  ]);

  const callStats = computeCallMetrics(todaysCalls);

  const entriesFor = (kpiName: string) => outreachEntries.filter((e) => e.kpiName === kpiName);
  const latestValue = (kpiName: string) => {
    const rows = entriesFor(kpiName);
    if (rows.length === 0) return null;
    return [...rows].sort((a, b) => b.period.localeCompare(a.period))[0].value;
  };
  const dmsSent = latestValue("DMs sent") ?? 0;
  const positiveReplies = latestValue("Positive replies") ?? 0;
  const replyRate = dmsSent > 0 ? Math.round((positiveReplies / dmsSent) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">Company · Dashboard</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-[0.88rem] text-text-dim">Everything that matters, today — calls straight from the CRM, outreach logged by hand.</p>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
          Sales calls (today, from the CRM)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Calls booked" value={String(callStats.booked)} />
          <StatTile label="Calls conducted" value={String(callStats.conducted)} />
          <StatTile label="Show rate" value={`${callStats.showRate}%`} good />
          <StatTile label="Close rate" value={`${callStats.closeRate}%`} good />
          <StatTile label="Cash collected" value={`$${callStats.cash.toLocaleString()}`} good />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
          Outreach (today, logged by hand)
        </h2>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile label="DMs sent" value={String(dmsSent)} />
          <StatTile label="Positive replies" value={String(positiveReplies)} />
          <StatTile label="Reply rate" value={`${replyRate}%`} good />
          <StatTile label="Messages sent" value={String(latestValue("Messages sent") ?? 0)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {OUTREACH_KPIS.map((kpi) => (
            <KpiCard key={kpi.name} department={OUTREACH_DEPARTMENT} kpi={kpi} entries={entriesFor(kpi.name)} />
          ))}
        </div>
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
