import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import {
  CALL_OUTCOME_LABELS,
  DEBRIEFABLE_OUTCOMES,
  CLOSER_STEPS,
  CLOSER_STEP_LABELS,
  ROOT_CAUSES,
  ROOT_CAUSE_LABELS,
  OBJECTION_TYPES,
  OBJECTION_TYPE_LABELS,
} from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function DebriefsPage() {
  const needsDebrief = await db.salesCall.findMany({
    where: { outcome: { in: [...DEBRIEFABLE_OUTCOMES] }, debrief: null },
    orderBy: { scheduledAt: "desc" },
    include: { lead: { select: { id: true, name: true } } },
    take: 30,
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const recentDebriefs = await db.callDebrief.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    include: { salesCall: { include: { lead: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const withScore = <T,>(rows: T[], get: (r: T) => number | null) => rows.map(get).filter((n): n is number => n !== null);
  const avg = (nums: number[]) => (nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10 : null);

  const scriptScores = withScore(recentDebriefs, (d) => d.scriptAdherence);
  const commitScores = withScore(recentDebriefs, (d) => d.commitmentScore);
  const avgScript = avg(scriptScores);
  const avgCommit = avg(commitScores);

  const weakStepCounts = CLOSER_STEPS.map((s) => ({
    step: s,
    count: recentDebriefs.filter((d) => d.weakestStep === s).length,
  })).sort((a, b) => b.count - a.count);
  const topWeakStep = weakStepCounts[0]?.count > 0 ? weakStepCounts[0] : null;

  const rootCauseCounts = ROOT_CAUSES.map((r) => ({
    cause: r,
    count: recentDebriefs.filter((d) => d.rootCause === r).length,
  })).sort((a, b) => b.count - a.count);

  const objectionCounts = OBJECTION_TYPES.map((o) => ({
    type: o,
    count: recentDebriefs.filter((d) => d.objectionType === o).length,
  })).sort((a, b) => b.count - a.count);
  const topObjection = objectionCounts[0]?.count > 0 ? objectionCounts[0] : null;

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Sales · Inside Sales
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Call debriefs</h1>
        <p className="mt-1 max-w-[65ch] text-[0.88rem] text-text-dim">
          Run the debrief after every call — no feelings, just data. Review this page for 30–45 minutes once a
          week to find the pattern and pick one thing to drill.
        </p>
        <Link href="/sales/crm" className="mt-2 inline-block text-[0.78rem] font-semibold text-accent-strong">
          ← Back to CRM
        </Link>
      </div>

      <Card className="mb-6 p-4">
        <h2 className="mb-1 text-[0.8rem] font-bold">This week&rsquo;s pattern</h2>
        <p className="mb-3 text-[0.76rem] text-text-faint">Last 7 days &middot; {recentDebriefs.length} debrief(s) logged.</p>

        {recentDebriefs.length === 0 ? (
          <p className="text-[0.8rem] text-text-faint">No debriefs logged this week yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Avg script adherence" value={avgScript !== null ? `${avgScript}/10` : "—"} />
            <Stat label="Avg commitment score" value={avgCommit !== null ? `${avgCommit}/10` : "—"} />
            <Stat
              label="Most common weak step"
              value={topWeakStep ? `${CLOSER_STEP_LABELS[topWeakStep.step]} (${topWeakStep.count})` : "—"}
            />
            <Stat
              label="Most common objection"
              value={topObjection ? `${OBJECTION_TYPE_LABELS[topObjection.type]} (${topObjection.count})` : "—"}
            />
          </div>
        )}

        {recentDebriefs.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BreakdownList
              title="Weak CLOSER step"
              rows={weakStepCounts.filter((r) => r.count > 0).map((r) => ({ label: CLOSER_STEP_LABELS[r.step], count: r.count }))}
            />
            <BreakdownList
              title="Root cause"
              rows={rootCauseCounts.filter((r) => r.count > 0).map((r) => ({ label: ROOT_CAUSE_LABELS[r.cause], count: r.count }))}
            />
          </div>
        )}
      </Card>

      <Card className="mb-6 overflow-hidden">
        <div className="p-4 pb-0">
          <h2 className="text-[0.8rem] font-bold">
            Needs a debrief <span className="font-mono text-[0.68rem] font-normal text-text-faint">{needsDebrief.length}</span>
          </h2>
        </div>
        {needsDebrief.length === 0 ? (
          <p className="p-4 text-[0.8rem] text-text-faint">Every disposed call has a debrief. Nice.</p>
        ) : (
          <div className="mt-3">
            {needsDebrief.map((c) => (
              <Link
                key={c.id}
                href={`/sales/crm/debriefs/${c.id}`}
                className="flex items-center gap-3 border-t border-border px-4 py-2.5 text-[0.83rem] transition-colors hover:bg-surface-hover"
              >
                <span className="font-mono text-[0.72rem] text-text-faint">{c.scheduledAt}</span>
                <span className="flex-1 truncate font-bold">{c.lead.name}</span>
                <span className="font-mono text-[0.7rem] text-text-faint">
                  {CALL_OUTCOME_LABELS[c.outcome as keyof typeof CALL_OUTCOME_LABELS] ?? c.outcome}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 pb-0">
          <h2 className="text-[0.8rem] font-bold">Debriefed this week</h2>
        </div>
        {recentDebriefs.length === 0 ? (
          <p className="p-4 text-[0.8rem] text-text-faint">Nothing logged yet.</p>
        ) : (
          <div className="mt-3">
            {recentDebriefs.map((d) => (
              <Link
                key={d.id}
                href={`/sales/crm/debriefs/${d.salesCallId}`}
                className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2.5 text-[0.83rem] transition-colors hover:bg-surface-hover"
              >
                <span className="font-mono text-[0.72rem] text-text-faint">{d.salesCall.scheduledAt}</span>
                <span className="flex-1 truncate font-bold">{d.salesCall.lead.name}</span>
                {d.weakestStep && (
                  <span className="rounded-full bg-accent-wash px-2 py-0.5 text-[0.65rem] font-bold text-accent-strong">
                    {CLOSER_STEP_LABELS[d.weakestStep as keyof typeof CLOSER_STEP_LABELS]}
                  </span>
                )}
                {d.rootCause && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.65rem] font-bold text-text-dim">
                    {d.rootCause}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[0.7rem] text-text-faint">{label}</div>
    </div>
  );
}

function BreakdownList({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <div>
      <h3 className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-text-faint">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-[0.78rem] text-text-faint">No data yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-[0.8rem]">
              <span className="text-text-dim">{r.label}</span>
              <span className="font-mono font-bold">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
