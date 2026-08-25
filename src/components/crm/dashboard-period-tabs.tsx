"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

export type PeriodMetrics = {
  booked: number;
  conducted: number;
  showRate: number;
  closeRate: number;
  cash: number;
};

type PeriodComparison = { current: PeriodMetrics; previous: PeriodMetrics };

const TABS = ["today", "week", "month"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { today: "Today", week: "This week", month: "This month" };

export function DashboardPeriodTabs({
  today,
  week,
  month,
}: {
  today: PeriodComparison;
  week: PeriodComparison;
  month: PeriodComparison;
}) {
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
        <MetricCard label="Calls booked" value={data.current.booked} prev={data.previous.booked} format="count" />
        <MetricCard label="Calls conducted" value={data.current.conducted} prev={data.previous.conducted} format="count" />
        <MetricCard label="Show rate" value={data.current.showRate} prev={data.previous.showRate} format="points" />
        <MetricCard label="Close rate" value={data.current.closeRate} prev={data.previous.closeRate} format="points" />
        <MetricCard label="Cash collected" value={data.current.cash} prev={data.previous.cash} format="cash" />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  prev,
  format,
}: {
  label: string;
  value: number;
  prev: number;
  format: "count" | "points" | "cash";
}) {
  const displayValue =
    format === "cash" ? `$${value.toLocaleString()}` : format === "points" ? `${value}%` : value.toLocaleString();
  const delta = deltaFor(value, prev, format);

  return (
    <Card className="p-4">
      <div className="text-[0.7rem] text-text-faint">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold tabular-nums">{displayValue}</div>
      <div className={`mt-1 text-[0.72rem] font-semibold ${delta.colorClass}`}>{delta.label}</div>
    </Card>
  );
}

/** Rate metrics (show rate, close rate) already read as percentages, so their
 *  own "% change" would be a confusing percent-of-a-percent — those compare
 *  in percentage points instead. Count/cash metrics compare as relative %. */
function deltaFor(value: number, prev: number, format: "count" | "points" | "cash"): { label: string; colorClass: string } {
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
