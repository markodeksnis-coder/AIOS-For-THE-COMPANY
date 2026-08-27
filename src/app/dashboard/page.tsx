import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { DashboardTabs } from "@/components/outreach/dashboard-tabs";
import { computeCallMetrics } from "@/lib/crm";
import { sumOutreach } from "@/lib/outreach";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);

  const [todaysCalls, todaysOutreach] = await Promise.all([
    db.salesCall.findMany({ where: { scheduledAt: todayStr } }),
    db.outreachLog.findMany({ where: { date: todayStr } }),
  ]);

  const callStats = computeCallMetrics(todaysCalls);
  const outreachStats = sumOutreach(todaysOutreach);

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">Company · Dashboard</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-[0.88rem] text-text-dim">Everything that matters, today — calls straight from the CRM, outreach logged by hand.</p>
      </div>

      <DashboardTabs active="/dashboard" />

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

      <section>
        <h2 className="mb-3 flex items-center justify-between font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
          <span>Outreach (today, logged by hand)</span>
          <span className="normal-case">
            <Link href="/dashboard/outbound" className="text-accent-strong">Cold Outbound</Link>
            {" · "}
            <Link href="/dashboard/appointments" className="text-accent-strong">Appointment Reporting</Link>
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="DMs sent" value={String(outreachStats.dmsSent)} />
          <StatTile label="Reply rate" value={`${outreachStats.replyRate}%`} good />
          <StatTile label="Positive replies" value={String(outreachStats.positiveReplies)} />
          <StatTile label="Members joined" value={String(outreachStats.membersJoined)} good />
          <StatTile label="Appointments booked" value={String(outreachStats.appointmentsBooked)} />
          <StatTile label="Show rate" value={`${outreachStats.showRate}%`} good />
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
