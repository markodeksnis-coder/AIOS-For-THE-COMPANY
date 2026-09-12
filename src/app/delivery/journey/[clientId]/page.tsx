import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  CALL_TARGET,
  PROGRAM_DAYS,
  computeMilestoneDetail,
  daysBetween,
  launchDay,
  milestonesFor,
  pace,
  phaseOf,
  prettyDate,
  relativeDate,
  toDeliveryClientData,
  todayISO,
} from "@/lib/delivery";
import { KpiTile } from "@/components/delivery/kpi-tile";
import { TickItem } from "@/components/delivery/tick-item";

export const dynamic = "force-dynamic";

export default async function DeliveryJourneyPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { clientId } = await params;
  const { day } = await searchParams;

  const rows = await db.deliveryClient.findMany({ orderBy: { createdAt: "asc" } });
  const clients = rows.map(toDeliveryClientData);
  const client = clients.find((c) => c.id === clientId);
  if (!client) notFound();

  const today = todayISO();
  const dayNow = daysBetween(client.startDate, today);
  const ms = client.system ? milestonesFor(client, today) : [];
  const p = pace(client, today);
  const ld = client.system ? launchDay(client.system, client.platform) : null;
  const doneCount = ms.filter((m) => m.status === "done").length;
  const detailDay = day ? Number(day) : null;
  const detail = detailDay !== null ? computeMilestoneDetail(client, detailDay, today) : null;

  return (
    <div className={`grid gap-6 ${detail ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]" : "grid-cols-1"}`}>
      <div className="flex min-w-0 flex-col gap-[18px]">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{client.name}</h1>
          <p className="mt-1 max-w-[76ch] text-[0.88rem] text-text-dim">
            {client.business} · every milestone date below is computed from Day 0 ({prettyDate(client.startDate)}). Change
            the start and the whole programme moves.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {clients.map((c) => {
            const active = c.id === client.id;
            return (
              <Link
                key={c.id}
                href={`/delivery/journey/${c.id}`}
                className={`rounded-full border px-3 py-1 text-[0.76rem] font-bold transition-colors ${
                  active ? "border-accent bg-accent-wash text-accent-strong" : "border-border text-text-faint hover:border-accent"
                }`}
              >
                {c.name}
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          <KpiTile label="Day" value={`${dayNow} / ${PROGRAM_DAYS}`} sub={phaseOf(dayNow).label} />
          <KpiTile
            label="Milestones done"
            value={`${doneCount} / ${ms.length}`}
            sub={client.system ? "Phase 1 + 2 mapped" : "No system assigned"}
            tone={client.system ? "default" : "crit"}
          />
          <KpiTile
            label="Calls delivered"
            value={`${client.delivered} / ${CALL_TARGET}`}
            sub={p.delta >= 0 ? `On pace (+${p.delta})` : `${p.delta} behind`}
            tone={p.delta >= 0 ? "good" : "warn"}
          />
          <KpiTile
            label="Outreach"
            value={!client.system ? "—" : ld === null ? "AP2 gated" : dayNow >= ld ? "Live" : `Day ${ld}`}
            sub={!client.system ? "Assign a system" : ld === null ? "No fixed SLA" : dayNow >= ld ? "Running" : "Warm-up running"}
            tone={!client.system ? "crit" : ld !== null && dayNow >= ld ? "good" : "warn"}
          />
        </div>

        {!client.system ? (
          <div className="rounded-2xl border border-critical/35 bg-surface p-4 text-[0.83rem] text-text-dim">
            No system assigned yet.{" "}
            <Link href="/delivery/assign" className="font-bold text-critical hover:underline">
              Run the assignment wizard →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {ms.map((m, i) => {
              const isLast = i === ms.length - 1;
              const color = m.blocked ? "var(--critical)" : m.status === "done" ? "var(--good)" : m.status === "current" ? "var(--accent-strong)" : "rgba(255,255,255,.22)";
              const dotIcon = m.status === "done" ? "✓" : m.blocked ? "!" : m.kind === "call" ? "●" : m.kind === "marker" ? "◆" : "○";
              const active = detailDay === m.day;
              return (
                <Link
                  key={m.day}
                  href={`/delivery/journey/${client.id}?day=${m.day}`}
                  className={`flex gap-3 rounded-xl px-2 pt-0.5 transition-colors hover:bg-surface-hover ${active ? "bg-surface-hover" : ""}`}
                >
                  <div className="flex w-14 flex-none flex-col items-center gap-0">
                    <span
                      className="grid h-6 w-6 place-items-center rounded-full border text-[0.66rem] font-extrabold"
                      style={{
                        borderColor: color,
                        backgroundColor: m.status === "done" ? "var(--good)" : m.blocked ? "var(--critical)" : "transparent",
                        color: m.status === "done" || m.blocked ? "var(--background)" : color,
                      }}
                    >
                      {dotIcon}
                    </span>
                    <span className="min-h-6 w-px flex-1" style={{ backgroundColor: isLast ? "transparent" : "rgba(255,255,255,.12)" }} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-[18px]">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-[0.68rem] text-text-faint">Day {m.day}</span>
                      <span className="text-[0.93rem] font-extrabold tracking-tight">{m.title}</span>
                      <span
                        className="rounded-full border px-2 py-px font-mono text-[0.62rem]"
                        style={{ borderColor: "rgba(255,255,255,.13)", color: m.kind === "marker" ? "var(--warn)" : "var(--text-faint)" }}
                      >
                        {m.kind === "call" ? m.duration : m.kind === "marker" ? "SOP pending" : "Checklist"}
                      </span>
                      <span className="font-mono text-[0.68rem] text-text-faint">
                        {prettyDate(m.date)} · {relativeDate(m.date, today)}
                      </span>
                    </div>
                    <span className="text-pretty max-w-[72ch] text-[0.8rem] text-text-dim">{m.blurb}</span>
                    {m.gate && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[0.62rem] uppercase tracking-wide text-text-faint">Gate</span>
                        <span className={`text-[0.74rem] font-bold ${m.status === "done" ? "text-good" : m.blocked ? "text-critical" : "text-warn"}`}>
                          {m.status === "done" ? `${m.gate.label} — met` : m.blocked ? `${m.gate.label} — NOT MET` : m.gate.label}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {detail && (
        <aside className="flex min-w-0 flex-col gap-[18px] border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="flex items-start gap-2.5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">{detail.eyebrow}</div>
              <div className="text-[1.05rem] font-extrabold tracking-tight">{detail.title}</div>
              <div className="text-[0.78rem] text-text-dim">{detail.sub}</div>
            </div>
            <Link
              href={`/delivery/journey/${client.id}`}
              className="grid h-6 w-6 flex-none place-items-center rounded-md text-[0.85rem] text-text-dim hover:bg-surface-hover hover:text-foreground"
            >
              ✕
            </Link>
          </div>

          {detail.flag && (
            <div className="rounded-xl border border-critical/40 bg-critical/10 p-3 text-[0.8rem] font-bold text-critical">{detail.flag}</div>
          )}

          {detail.showAgenda && (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="flex-1 font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">Call structure</span>
                <span className="font-mono text-[0.68rem] text-text-faint">{detail.agendaTotal}</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-border">
                {detail.agenda.map((a, i) => (
                  <div
                    key={a.section}
                    className={`grid grid-cols-[1fr_auto] gap-2.5 px-[11px] py-2 text-[0.78rem] ${i < detail.agenda.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <span className="text-foreground/90">{a.section}</span>
                    <span className="font-mono text-text-faint">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail.showChecklist && (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="flex-1 font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">{detail.checklistTitle}</span>
                <ChecklistCount checked={detail.checklist.filter((c) => c.ticked).length} total={detail.checklist.length} />
              </div>
              <div className="overflow-hidden rounded-xl border border-border">
                {detail.checklist.map((item, i) => (
                  <TickItem key={item.index} clientId={client.id} item={item} last={i === detail.checklist.length - 1} />
                ))}
              </div>
              <span className="text-[0.7rem] text-text-faint">{detail.checklistNote}</span>
            </div>
          )}

          {detail.showDeliverables && (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">What I must build first</span>
              <div className="overflow-hidden rounded-xl border border-border">
                {detail.deliverables.map((item, i) => (
                  <TickItem key={item.index} clientId={client.id} item={item} last={i === detail.deliverables.length - 1} />
                ))}
              </div>
            </div>
          )}

          {detail.showMetricSlot && (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="flex-1 font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">Client metrics</span>
                <span className="rounded-md bg-warn-wash px-1.5 py-px font-mono text-[0.6rem] uppercase tracking-wide text-warn">not wired</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {detail.metricSlots.map((m) => (
                  <div key={m.label} className="flex flex-col gap-0.5 rounded-[11px] border border-dashed border-white/15 p-2.5">
                    <span className="text-[0.66rem] text-text-faint">{m.label}</span>
                    <span className="font-mono text-base font-bold text-text-faint">—</span>
                    <span className="text-[0.62rem] text-text-faint">{m.tells}</span>
                  </div>
                ))}
              </div>
              <span className="text-[0.7rem] text-text-faint">
                The slot exists; nothing writes to it yet. Wire it when you decide whether the client submits these or you log them on the
                weekly call.
              </span>
            </div>
          )}

          {detail.showNonNegotiables && (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">Non-negotiables</span>
              <div className="flex flex-col gap-1.5">
                {detail.nonNegotiables.map((n) => (
                  <div key={n} className="grid grid-cols-[14px_1fr] items-start gap-2.5 text-[0.76rem] text-text-dim">
                    <span className="text-[0.7rem] text-accent">▪</span>
                    <span className="text-pretty">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-accent-wash p-3">
            <span className="font-mono text-[0.65rem] uppercase tracking-widest text-accent-strong">{detail.footLabel}</span>
            <span className="text-pretty text-[0.78rem] leading-[1.55] text-accent-strong/90">{detail.foot}</span>
          </div>
        </aside>
      )}
    </div>
  );
}

function ChecklistCount({ checked, total }: { checked: number; total: number }) {
  if (total === 0) return null;
  return (
    <span className={`font-mono text-[0.68rem] font-bold ${checked === total ? "text-good" : "text-warn"}`}>
      {checked} / {total}
    </span>
  );
}
