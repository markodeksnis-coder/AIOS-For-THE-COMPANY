import Link from "next/link";
import type { OutreachLog } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { sumOutreach } from "@/lib/outreach";
import { hrefWith, type DashboardParams, type Drill } from "@/lib/outreach-url";

/** The drill-down rail: what's behind one row of a breakdown table. Server
 *  component — the selection lives in the `drill` query param, so this
 *  renders from the same query the page already ran, not a second fetch or
 *  a client store.
 *
 *  Deliberately shows the raw logged rows, not just the totals: every
 *  number on these tabs is hand-typed at the daily check-in, so "which
 *  rows produced this" is the first question anyone asks about a total
 *  that looks wrong. */
export function DetailRail({
  basePath,
  params,
  drill,
  rows,
}: {
  basePath: string;
  params: DashboardParams;
  drill: Drill;
  rows: OutreachLog[];
}) {
  const totals = sumOutreach(rows);
  const eyebrow =
    drill.field === "date" ? "Logged day" : drill.field === "id" ? "Logged row" : drill.field;

  const funnel = [
    { label: "DMs sent", value: totals.dmsSent, color: "var(--accent)" },
    { label: "Messages seen", value: totals.messagesSeen, color: "var(--accent-strong)" },
    { label: "Replies", value: totals.repliesReceived, color: "var(--graph-people)" },
    { label: "Positive replies", value: totals.positiveReplies, color: "var(--graph-knowledge)" },
    { label: "Appointments", value: totals.appointmentsBooked, color: "var(--warn)" },
    { label: "Shows", value: totals.shows, color: "var(--good)" },
    { label: "Members joined", value: totals.membersJoined, color: "var(--graph-work)" },
  ];
  const max = Math.max(1, totals.dmsSent);

  return (
    <aside className="flex w-[380px] shrink-0 flex-col gap-5">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">{eyebrow}</div>
          <div className="text-[1.05rem] font-extrabold tracking-tight">{drill.key}</div>
          <div className="text-[0.78rem] text-text-dim">
            {rows.length} logged {rows.length === 1 ? "row" : "rows"}
          </div>
        </div>
        <Link
          href={hrefWith(basePath, params, { drill: null })}
          className="rounded-lg px-2 py-1 text-[0.8rem] text-text-faint transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label="Close detail"
        >
          ✕
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="DMs sent" value={totals.dmsSent.toLocaleString()} />
        <MiniStat label="Reply rate" value={`${totals.replyRate}%`} good />
        <MiniStat label="Members joined" value={String(totals.membersJoined)} good />
        <MiniStat label="Cash collected" value={`$${totals.cashCollected.toLocaleString()}`} good={totals.cashCollected > 0} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">Funnel</div>
        {funnel.map((f) => (
          <div key={f.label} className="grid grid-cols-[7.25rem_1fr_2.75rem] items-center gap-2.5">
            <span className="text-[0.76rem] text-text-dim">{f.label}</span>
            <span className="block h-2 overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.round((f.value / max) * 100)}%`, backgroundColor: f.color }}
              />
            </span>
            <span className="text-right font-mono text-[0.76rem] tabular-nums">{f.value.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">
          {drill.field === "date" ? "Rows on this day" : "Rows behind this total"}
        </div>
        <Card className="overflow-hidden p-0">
          {rows
            .slice()
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .slice(0, 12)
            .map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[1.1fr_0.9fr_0.7fr_0.7fr_0.9fr] items-center gap-1.5 border-b border-border px-3 py-2 text-[0.74rem] last:border-b-0"
              >
                <span className="font-mono text-text-faint">{r.date}</span>
                <span className="truncate">{drill.field === "source" ? r.setter : r.source}</span>
                <span className="text-right font-mono">{r.dmsSent}</span>
                <span className="text-right font-mono">{r.repliesReceived}</span>
                <span className={r.membersJoined > 0 ? "text-right font-mono text-good" : "text-right font-mono text-text-faint"}>
                  {r.membersJoined} joined
                </span>
              </div>
            ))}
        </Card>
        <p className="text-[0.7rem] text-text-faint">
          {rows.length > 12 ? `Showing 12 of ${rows.length} rows.` : "All rows shown."}
          {" Columns: date · "}
          {drill.field === "source" ? "setter" : "source"}
          {" · DMs · replies · members joined."}
        </p>
      </div>

      {rows.some((r) => r.note) && (
        <div className="flex flex-col gap-2">
          <div className="font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">Notes</div>
          <Card className="flex flex-col gap-2 p-3">
            {rows
              .filter((r) => r.note)
              .slice(0, 5)
              .map((r) => (
                <div key={r.id} className="text-[0.76rem] leading-relaxed text-text-dim">
                  <span className="mr-1.5 font-mono text-[0.7rem] text-text-faint">{r.date}</span>
                  {r.note}
                </div>
              ))}
          </Card>
        </div>
      )}
    </aside>
  );
}

function MiniStat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <Card className="p-2.5">
      <div className="text-[0.68rem] text-text-faint">{label}</div>
      <div className={good ? "font-mono text-[1rem] font-bold text-good" : "font-mono text-[1rem] font-bold"}>{value}</div>
    </Card>
  );
}
