import Link from "next/link";
import { db } from "@/lib/db";
import {
  CALL_TARGET,
  PROGRAM_DAYS,
  launchDay,
  milestonesFor,
  nextMilestone,
  pace,
  phaseOf,
  prettyDate,
  relativeDate,
  toDeliveryClientData,
  todayISO,
  daysBetween,
} from "@/lib/delivery";

export const dynamic = "force-dynamic";

export default async function DeliveryClientsPage() {
  const rows = await db.deliveryClient.findMany({ orderBy: { createdAt: "asc" } });
  const clients = rows.map(toDeliveryClientData);
  const today = todayISO();

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Clients</h1>
        <p className="mt-1 max-w-[76ch] text-[0.88rem] text-text-dim">
          Every client in delivery on one screen, positioned on their own 180-day track. Ticks are the Phase 1
          milestones; the filled bar is elapsed time.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {clients.map((c) => {
          const dayNow = daysBetween(c.startDate, today);
          const phase = phaseOf(dayNow);
          const next = c.system ? nextMilestone(c, today) : null;
          const p = pace(c, today);
          const ld = c.system ? launchDay(c.system, c.platform) : null;
          const ms = c.system ? milestonesFor(c, today) : [];
          const blocked = !!next?.blocked;

          return (
            <Link
              key={c.id}
              href={`/delivery/journey/${c.id}`}
              className={`rounded-2xl border p-4 px-[18px] backdrop-blur-xl transition-colors hover:border-white/20 ${
                blocked ? "border-critical/35" : "border-border"
              } bg-surface shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_12px_28px_-14px_rgba(0,0,0,0.55)]`}
            >
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1.3fr] items-start gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-base font-extrabold tracking-tight">{c.name}</span>
                    <span
                      className="rounded-full border px-2 py-0.5 text-[0.66rem] font-bold"
                      style={{
                        borderColor: c.system ? "rgba(255,255,255,.14)" : "var(--critical)",
                        color: c.system ? phase.colorVar : "var(--critical)",
                      }}
                    >
                      {c.system ? phase.label : "Awaiting assignment"}
                    </span>
                  </div>
                  <span className="text-[0.78rem] text-text-dim">{c.business}</span>
                  <span className="font-mono text-[0.7rem] text-text-faint">
                    Day {dayNow} of {PROGRAM_DAYS} · started {prettyDate(c.startDate)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-mono text-[0.62rem] uppercase tracking-wide text-text-faint">System</span>
                  <span className={`text-[0.85rem] font-bold ${c.system ? "text-foreground" : "text-critical"}`}>
                    {c.system ?? "Not assigned"}
                  </span>
                  <span className="text-[0.72rem] text-text-faint">
                    {!c.system
                      ? "Run the 3-question wizard"
                      : ld === null
                        ? "Launch gated on AP2 registration"
                        : dayNow >= ld
                          ? `Outreach live since Day ${ld}`
                          : `Launches Day ${ld}${c.platform ? ` (${c.platform})` : ""}`}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-mono text-[0.62rem] uppercase tracking-wide text-text-faint">Calls</span>
                  <span className="font-mono text-[0.95rem] font-bold">
                    {c.delivered} / {CALL_TARGET}
                  </span>
                  <span className={`text-[0.72rem] font-bold ${!c.system ? "text-text-faint" : p.delta >= 0 ? "text-good" : "text-warn"}`}>
                    {!c.system ? "—" : p.delta >= 0 ? `On pace (+${p.delta})` : `${p.delta} behind pace`}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-mono text-[0.62rem] uppercase tracking-wide text-text-faint">Next milestone</span>
                  <span className="text-[0.83rem] font-bold">{next ? next.title : c.system ? "Programme complete" : "System assignment"}</span>
                  <span className={`text-[0.72rem] font-bold ${next?.blocked ? "text-critical" : c.system ? "text-text-dim" : "text-critical"}`}>
                    {next ? (next.blocked ? `BLOCKED · ${relativeDate(next.date, today)}` : relativeDate(next.date, today)) : c.system ? "—" : "Do this first"}
                  </span>
                </div>
              </div>

              <div className="mt-3.5 flex flex-col gap-1.5">
                <div className="relative h-2 rounded-sm bg-surface-2">
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm"
                    style={{
                      width: `${Math.min(100, (dayNow / PROGRAM_DAYS) * 100).toFixed(1)}%`,
                      backgroundImage: "linear-gradient(90deg,#6366F1,#14B8A6)",
                    }}
                  />
                  {ms
                    .filter((m) => m.kind === "call" || m.kind === "checkpoint")
                    .map((m) => {
                      const left = Math.min(99.4, (m.day / PROGRAM_DAYS) * 100);
                      const color = m.blocked ? "var(--critical)" : m.status === "done" ? "var(--good)" : "rgba(255,255,255,.35)";
                      return (
                        <span
                          key={m.day}
                          title={`Day ${m.day} · ${m.title}`}
                          className="absolute -top-[3px] h-3.5 w-[3px] rounded-sm"
                          style={{ left: `${left.toFixed(2)}%`, backgroundColor: color }}
                        />
                      );
                    })}
                </div>
                <div className="flex justify-between font-mono text-[0.62rem] text-text-faint">
                  <span>Day 0</span>
                  <span>Day 60</span>
                  <span>Day 120</span>
                  <span>Day 180</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
