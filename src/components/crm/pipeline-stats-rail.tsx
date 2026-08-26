"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

const STORAGE_KEY = "company-os-crm-rail-open";

export type TodayStats = { booked: number; conducted: number; showRate: number; closeRate: number; cash: number };
export type RailQueueItem = { id: string; label: string };

/** Persistent stats rail beside the board — an alternative to burying the
 *  numbers on a separate Dashboard page. Collapsible (state kept in
 *  localStorage) so the board can have the full width back when wanted. */
export function PipelineStatsRail({
  stats,
  confirmedToday,
  reactivation,
}: {
  stats: TodayStats;
  confirmedToday: RailQueueItem[];
  reactivation: RailQueueItem[];
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setOpen(stored === "1");
    } catch {
      // localStorage unavailable — keep the default (open)
    }
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // best-effort only
      }
      return next;
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="h-fit shrink-0 rounded-lg border border-border px-2 py-3 text-[0.7rem] font-semibold text-text-faint transition-colors hover:border-accent hover:text-foreground"
        style={{ writingMode: "vertical-rl" }}
      >
        Show stats
      </button>
    );
  }

  return (
    <div className="flex w-[280px] shrink-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">Today</div>
        <button type="button" onClick={toggle} className="text-[0.7rem] font-semibold text-text-faint hover:text-foreground">
          Hide ×
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Calls booked" value={stats.booked.toLocaleString()} />
        <StatTile label="Show rate" value={`${stats.showRate}%`} good />
        <StatTile label="Close rate" value={`${stats.closeRate}%`} good />
        <StatTile label="Cash" value={`$${stats.cash.toLocaleString()}`} good />
      </div>

      <Card className="p-3">
        <div className="mb-2 text-[0.76rem] font-bold">
          Today&rsquo;s confirmed calls <span className="font-mono text-[0.66rem] font-normal text-text-faint">{confirmedToday.length}</span>
        </div>
        {confirmedToday.length === 0 ? (
          <p className="text-[0.74rem] text-text-faint">Nothing booked for today yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {confirmedToday.map((c) => (
              <li key={c.id} className="truncate text-[0.76rem] text-text-dim">
                {c.label}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-3">
        <div className="mb-2 text-[0.76rem] font-bold">
          Reactivation list <span className="font-mono text-[0.66rem] font-normal text-text-faint">{reactivation.length}</span>
        </div>
        {reactivation.length === 0 ? (
          <p className="text-[0.74rem] text-text-faint">No leads tagged for reactivation.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {reactivation.map((r) => (
              <li key={r.id} className="truncate text-[0.76rem] text-text-dim">
                {r.label}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Link href="/sales/crm/dashboard" className="text-[0.76rem] font-semibold text-accent-strong hover:underline">
        Full dashboard →
      </Link>
    </div>
  );
}

function StatTile({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <Card className="p-2.5">
      <div className="text-[0.64rem] text-text-faint">{label}</div>
      <div className={`mt-0.5 font-mono text-[0.98rem] font-bold ${good ? "text-good" : "text-foreground"}`}>{value}</div>
    </Card>
  );
}
