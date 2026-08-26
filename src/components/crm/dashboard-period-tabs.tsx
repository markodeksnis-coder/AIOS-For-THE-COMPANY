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
        <MetricCard
          label="Calls booked"
          value={data.current.booked}
          prev={data.previous.booked}
          format="count"
          color="var(--graph-people)"
        />
        <MetricCard
          label="Calls conducted"
          value={data.current.conducted}
          prev={data.previous.conducted}
          format="count"
          color="var(--graph-knowledge)"
        />
        <MetricCard
          label="Show rate"
          value={data.current.showRate}
          prev={data.previous.showRate}
          format="points"
          color="var(--graph-work)"
          gauge
        />
        <MetricCard
          label="Close rate"
          value={data.current.closeRate}
          prev={data.previous.closeRate}
          format="points"
          color="var(--good)"
          gauge
        />
        <MetricCard
          label="Cash collected"
          value={data.current.cash}
          prev={data.previous.cash}
          format="cash"
          color="var(--accent-strong)"
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  prev,
  format,
  color,
  gauge = false,
}: {
  label: string;
  value: number;
  prev: number;
  format: "count" | "points" | "cash";
  color: string;
  gauge?: boolean;
}) {
  const displayValue =
    format === "cash" ? `$${value.toLocaleString()}` : format === "points" ? `${value}%` : value.toLocaleString();
  const delta = deltaFor(value, prev, format);

  return (
    <Card
      className="relative overflow-hidden p-4"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 5%, transparent)` }}
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[0.7rem] text-text-faint">{label}</div>
          <div className="mt-1 font-mono text-xl font-bold tabular-nums" style={{ color }}>
            {displayValue}
          </div>
          <div className={`mt-1 text-[0.72rem] font-semibold ${delta.colorClass}`}>{delta.label}</div>
        </div>
        {gauge && <RadialGauge value={value} color={color} />}
      </div>
    </Card>
  );
}

/** Small ring gauge for the two rate metrics — a percentage reads faster as
 *  a filled arc than as a fifth number sitting next to four others. */
function RadialGauge({ value, color }: { value: number; color: string }) {
  const size = 40;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c - (clamped / 100) * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
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
