import Link from "next/link";
import { db } from "@/lib/db";
import {
  blockedList,
  pace,
  prepQueueList,
  toDeliveryClientData,
  todayISO,
  upcomingList,
} from "@/lib/delivery";
import { Card } from "@/components/ui/card";
import { KpiTile } from "@/components/delivery/kpi-tile";
import { PrepQueue } from "@/components/delivery/prep-queue";

export const dynamic = "force-dynamic";

export default async function DeliveryTodayPage() {
  const rows = await db.deliveryClient.findMany({ orderBy: { createdAt: "asc" } });
  const clients = rows.map(toDeliveryClientData);
  const today = todayISO();

  const active = clients.filter((c) => c.system);
  const blocked = blockedList(clients, today);
  const upcoming = upcomingList(clients, today);
  const prep = prepQueueList(clients, today);
  const prepOpen = prep.filter((p) => !p.ticked).length;
  const behind = active.filter((c) => pace(c, today).delta < 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Today</h1>
        <p className="mt-1 max-w-[76ch] text-[0.88rem] text-text-dim">
          What is blocked, what is coming, and what you owe before each call. Every date here is computed from that
          client&rsquo;s Day 0 — nothing is typed in twice.
        </p>
      </div>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <KpiTile
          label="Clients in delivery"
          value={String(active.length)}
          sub={clients.length - active.length > 0 ? `${clients.length - active.length} awaiting assignment` : "All assigned"}
          tone={clients.length - active.length > 0 ? "warn" : "good"}
        />
        <KpiTile
          label="Blocked gates"
          value={String(blocked.length)}
          sub={blocked.length ? "Chase or reschedule today" : "Nothing to chase"}
          tone={blocked.length ? "crit" : "good"}
        />
        <KpiTile label="Calls this week" value={String(upcoming.length)} sub="Next 7 days" />
        <KpiTile
          label="Prep items open"
          value={String(prepOpen)}
          sub={behind ? `${behind} ${behind === 1 ? "client" : "clients"} behind pace` : "All clients on pace"}
          tone={prepOpen ? "warn" : "good"}
        />
      </section>

      <section>
        <SectionHeading tone="crit">Blocked — gate not met</SectionHeading>
        {blocked.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {blocked.map((b) => (
              <Link
                key={`${b.clientId}-${b.day}`}
                href={`/delivery/journey/${b.clientId}?day=${b.day}`}
                className="grid grid-cols-[1fr_auto] items-start gap-3.5 rounded-2xl border border-critical/35 bg-[color-mix(in_srgb,var(--critical)_7%,var(--surface))] p-4 backdrop-blur-xl transition-colors hover:border-critical/60"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[0.95rem] font-extrabold tracking-tight">{b.clientName}</span>
                    <span className="font-mono text-[0.68rem] text-text-faint">
                      Day {b.clientDay} · {b.system}
                    </span>
                  </div>
                  <div className="text-[0.83rem] text-foreground">{b.headline}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {b.missing.map((m) => (
                      <span key={m} className="rounded-full border border-critical/40 px-2 py-0.5 text-[0.7rem] font-bold text-critical">
                        {m}
                      </span>
                    ))}
                  </div>
                  <div className="text-[0.78rem] text-text-dim">{b.action}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5 whitespace-nowrap">
                  <span className="font-mono text-[0.68rem] text-text-faint">{b.callLabel}</span>
                  <span className="font-mono text-[0.95rem] font-bold text-critical">{b.countdown}</span>
                  <span className="rounded-lg border border-border px-2.5 py-1 text-[0.74rem] font-bold text-foreground">
                    Reschedule
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-4 text-[0.83rem] text-text-dim">Every gate is met. Nothing to chase.</Card>
        )}
      </section>

      <section>
        <SectionHeading trailing={`${prepOpen} prep items open across ${active.length} clients`}>Next 7 days</SectionHeading>
        <div className="flex flex-col gap-2">
          {upcoming.length === 0 && <Card className="p-4 text-[0.83rem] text-text-dim">Nothing booked in the next 7 days.</Card>}
          {upcoming.map((u) => (
            <Link
              key={`${u.clientId}-${u.day}`}
              href={`/delivery/journey/${u.clientId}?day=${u.day}`}
              className="grid grid-cols-[0.8fr_1.5fr_0.9fr_1fr] items-center gap-4 rounded-2xl border border-border bg-surface p-3.5 px-4 backdrop-blur-xl transition-colors hover:border-white/20"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-mono text-[0.68rem] text-text-faint">{u.when}</span>
                <span className="font-mono text-[0.9rem] font-bold">{u.date}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[0.88rem] font-extrabold tracking-tight">{u.call}</span>
                <span className="text-[0.78rem] text-text-dim">
                  {u.clientName} · Day {u.clientDay} · {u.duration}
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-[0.62rem] uppercase tracking-wide text-text-faint">Gate</span>
                <span className={`text-[0.8rem] font-bold ${toneText(u.gateTone)}`}>{u.gate}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-[0.62rem] uppercase tracking-wide text-text-faint">I must build</span>
                <span className={`text-[0.8rem] font-bold ${toneText(u.prepTone)}`}>{u.prep}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading>Prep queue</SectionHeading>
        <PrepQueue items={prep} />
      </section>
    </div>
  );
}

function toneText(tone: "crit" | "good" | "warn" | "faint") {
  return tone === "crit" ? "text-critical" : tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-text-faint";
}

function SectionHeading({
  children,
  trailing,
  tone,
}: {
  children: React.ReactNode;
  trailing?: string;
  tone?: "crit";
}) {
  return (
    <h2 className="mb-2.5 flex items-center gap-2.5 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
      <span className={tone === "crit" ? "text-critical" : undefined}>{children}</span>
      <span className="h-px flex-1 bg-border" />
      {trailing && <span className="font-sans text-[0.68rem] font-bold normal-case tracking-normal text-text-faint">{trailing}</span>}
    </h2>
  );
}
