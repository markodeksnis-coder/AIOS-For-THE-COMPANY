"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

export type FollowUpMetrics = {
  sent: number;
  replied: number;
  replyRate: number; // 0-100
  watched: number;
  booked: number;
};

type PeriodComparison = { current: FollowUpMetrics; previous: FollowUpMetrics };

const TABS = ["today", "week", "month"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { today: "Today", week: "This week", month: "This month" };

export function FollowUpPeriodTabs({ today, week, month }: { today: PeriodComparison; week: PeriodComparison; month: PeriodComparison }) {
  const [tab, setTab] = useState<Tab>("today");
  const data = { today, week, month }[tab];

  return (
    <div>
      <div className="mb-3 flex w-fit gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-[0.78rem] font-semibold transition-colors ${
              tab === t ? "bg-accent text-on-accent" : "text-text-dim hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricCard label="Sent" value={data.current.sent} prev={data.previous.sent} format="count" />
        <MetricCard label="Replied" value={data.current.replied} prev={data.previous.replied} format="count" />
        <MetricCard label="Reply rate" value={data.current.replyRate} prev={data.previous.replyRate} format="points" />
        <MetricCard label="Watched" value={data.current.watched} prev={data.previous.watched} format="count" />
        <MetricCard label="Booked from it" value={data.current.booked} prev={data.previous.booked} format="count" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, prev, format }: { label: string; value: number; prev: number; format: "count" | "points" }) {
  const displayValue = format === "points" ? `${value}%` : value.toLocaleString();
  const delta = deltaFor(value, prev, format);

  return (
    <Card className="p-4">
      <div className="text-[0.7rem] text-text-faint">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold tabular-nums">{displayValue}</div>
      <div className={`mt-1 text-[0.72rem] font-semibold ${delta.colorClass}`}>{delta.label}</div>
    </Card>
  );
}

function deltaFor(value: number, prev: number, format: "count" | "points"): { label: string; colorClass: string } {
  if (format === "points") {
    const diff = value - prev;
    if (prev === 0 && value === 0) return { label: "—", colorClass: "text-text-faint" };
    if (diff === 0) return { label: "flat vs prior", colorClass: "text-text-faint" };
    return { label: `${diff > 0 ? "+" : ""}${diff}pts vs prior`, colorClass: diff > 0 ? "text-good" : "text-critical" };
  }

  if (prev === 0) {
    if (value === 0) return { label: "—", colorClass: "text-text-faint" };
    return { label: "new vs prior", colorClass: "text-good" };
  }

  const pct = Math.round(((value - prev) / prev) * 100);
  if (pct === 0) return { label: "flat vs prior", colorClass: "text-text-faint" };
  return { label: `${pct > 0 ? "+" : ""}${pct}% vs prior`, colorClass: pct > 0 ? "text-good" : "text-critical" };
}
