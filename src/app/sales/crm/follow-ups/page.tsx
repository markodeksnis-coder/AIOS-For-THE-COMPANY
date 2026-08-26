import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { NewFollowUpForm } from "@/components/crm/new-follow-up-form";
import { FollowUpSweepButton } from "@/components/crm/follow-up-sweep-button";
import { FollowUpQueue, type QueuedTouch } from "@/components/crm/follow-up-queue";
import { FollowUpPeriodTabs, type FollowUpMetrics } from "@/components/crm/follow-up-period-tabs";
import { FollowUpLog, type LoggedTouch } from "@/components/crm/follow-up-log";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const [touches, leads] = await Promise.all([
    db.followUpTouch.findMany({
      include: {
        lead: { select: { id: true, name: true } },
        drafts: { orderBy: { createdAt: "asc" }, select: { id: true, channel: true, content: true } },
      },
      orderBy: { dueAt: "asc" },
    }),
    db.lead.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 86_400_000);
  const startOfDayAfter = new Date(startOfToday.getTime() + 2 * 86_400_000);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
  const shiftMonth = (d: Date, delta: number) => {
    const targetMonth = d.getMonth() + delta;
    const daysInTargetMonth = new Date(d.getFullYear(), targetMonth + 1, 0).getDate();
    return new Date(d.getFullYear(), targetMonth, Math.min(d.getDate(), daysInTargetMonth));
  };

  const queued = touches.filter((t) => t.sentAt === null);
  const todaysQueue: QueuedTouch[] = queued
    .filter((t) => t.dueAt >= startOfToday && t.dueAt < startOfTomorrow)
    .map(toQueued);
  const tomorrowsQueue: QueuedTouch[] = queued
    .filter((t) => t.dueAt >= startOfTomorrow && t.dueAt < startOfDayAfter)
    .map(toQueued);
  const overdueQueue: QueuedTouch[] = queued.filter((t) => t.dueAt < startOfToday).map(toQueued);

  function metricsFor(start: Date, end: Date): FollowUpMetrics {
    const inRange = touches.filter((t) => t.sentAt && t.sentAt >= start && t.sentAt < end);
    const sent = inRange.length;
    const replied = inRange.filter((t) => t.repliedAt).length;
    return {
      sent,
      replied,
      replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      watched: inRange.filter((t) => t.watched).length,
      booked: inRange.filter((t) => t.bookedFromThis).length,
    };
  }

  const periodData = {
    today: { current: metricsFor(startOfToday, startOfTomorrow), previous: metricsFor(addDays(startOfToday, -1), startOfToday) },
    week: { current: metricsFor(startOfWeek, addDays(now, 1)), previous: metricsFor(addDays(startOfWeek, -7), addDays(startOfWeek, 0)) },
    month: {
      current: metricsFor(startOfMonth, addDays(now, 1)),
      previous: metricsFor(shiftMonth(startOfMonth, -1), startOfMonth),
    },
  };

  const templateNames = [...new Set(touches.map((t) => t.templateName))].sort();
  const leaderboard = templateNames.map((name) => {
    const rows = touches.filter((t) => t.templateName === name && t.sentAt);
    const sent = rows.length;
    const replied = rows.filter((t) => t.repliedAt).length;
    const watchedRows = rows.filter((t) => t.watched);
    const totalViews = watchedRows.reduce((sum, t) => sum + (t.viewCount ?? 0), 0);
    return {
      name,
      sent,
      replied,
      replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      watched: watchedRows.length,
      avgViews: watchedRows.length > 0 ? Math.round(totalViews / watchedRows.length) : null,
      booked: rows.filter((t) => t.bookedFromThis).length,
    };
  });

  const recentLog: LoggedTouch[] = touches
    .filter((t) => t.sentAt)
    .sort((a, b) => (b.sentAt as Date).getTime() - (a.sentAt as Date).getTime())
    .slice(0, 30)
    .map((t) => ({
      id: t.id,
      leadId: t.leadId,
      leadName: t.lead.name,
      templateName: t.templateName,
      sentAt: (t.sentAt as Date).toISOString(),
      repliedAt: t.repliedAt ? t.repliedAt.toISOString() : null,
      watched: t.watched,
      viewCount: t.viewCount,
      bookedFromThis: t.bookedFromThis,
    }));

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">Sales · Inside Sales</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Follow-ups</h1>
        <p className="mt-1 max-w-[65ch] text-[0.88rem] text-text-dim">
          Personalized Loom follow-ups — what&rsquo;s due, what&rsquo;s been sent, and which template actually gets replies.
        </p>
        <Link href="/sales/crm" className="mt-2 inline-block text-[0.78rem] font-semibold text-accent-strong">
          ← Back to Pipeline
        </Link>
      </div>

      <FollowUpSweepButton />

      <NewFollowUpForm leads={leads} templateNames={templateNames} />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FollowUpQueue title="Due today" touches={todaysQueue} empty="Nothing due today." />
        <FollowUpQueue title="Due tomorrow" touches={tomorrowsQueue} empty="Nothing queued for tomorrow." />
        <FollowUpQueue title="Overdue" touches={overdueQueue} empty="Nothing overdue." />
      </div>

      <div className="mb-6">
        <FollowUpPeriodTabs today={periodData.today} week={periodData.week} month={periodData.month} />
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-[0.8rem] font-bold">Leaderboard — by template</h2>
        <LeaderboardTable rows={leaderboard} />
      </div>

      <div>
        <h2 className="mb-3 text-[0.8rem] font-bold">
          Recent history <span className="font-mono text-[0.68rem] font-normal text-text-faint">last {recentLog.length}</span>
        </h2>
        <FollowUpLog touches={recentLog} />
      </div>
    </div>
  );
}

function toQueued(t: {
  id: string;
  leadId: string;
  lead: { name: string };
  templateName: string;
  dueAt: Date;
  drafts: { id: string; channel: string; content: string }[];
}): QueuedTouch {
  return {
    id: t.id,
    leadId: t.leadId,
    leadName: t.lead.name,
    templateName: t.templateName,
    dueAt: t.dueAt.toISOString(),
    drafts: t.drafts,
  };
}

function LeaderboardTable({
  rows,
}: {
  rows: { name: string; sent: number; replied: number; replyRate: number; watched: number; avgViews: number | null; booked: number }[];
}) {
  return (
    <Card className="overflow-x-auto p-4">
      {rows.length === 0 ? (
        <p className="text-[0.8rem] text-text-faint">No follow-ups logged yet.</p>
      ) : (
        <table className="w-full text-[0.78rem]">
          <thead>
            <tr className="border-b border-border text-left text-text-faint">
              <th className="pb-1.5 font-medium">Template</th>
              <th className="pb-1.5 text-right font-medium">Sent</th>
              <th className="pb-1.5 text-right font-medium">Replied</th>
              <th className="pb-1.5 text-right font-medium">Reply %</th>
              <th className="pb-1.5 text-right font-medium">Watched</th>
              <th className="pb-1.5 text-right font-medium">Avg views</th>
              <th className="pb-1.5 text-right font-medium">Booked</th>
            </tr>
          </thead>
          <tbody>
            {[...rows]
              .sort((a, b) => b.replyRate - a.replyRate)
              .map((r) => (
                <tr key={r.name} className="border-b border-border last:border-b-0">
                  <td className="py-1.5 font-semibold">{r.name}</td>
                  <td className="py-1.5 text-right font-mono">{r.sent}</td>
                  <td className="py-1.5 text-right font-mono">{r.replied}</td>
                  <td className="py-1.5 text-right font-mono font-bold text-good">{r.replyRate}%</td>
                  <td className="py-1.5 text-right font-mono">{r.watched}</td>
                  <td className="py-1.5 text-right font-mono">{r.avgViews ?? "—"}</td>
                  <td className="py-1.5 text-right font-mono">{r.booked}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
