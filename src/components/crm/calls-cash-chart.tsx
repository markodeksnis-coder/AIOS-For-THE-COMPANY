"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";

export type ChartPoint = { date: string; conducted: number; cash: number };

const WIDTH = 720;
const HEIGHT = 180;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 8;
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

const CONDUCTED_COLOR = "var(--graph-people)";
const CASH_COLOR = "var(--graph-work)";

export function CallsCashChart({ points }: { points: ChartPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const maxConducted = Math.max(1, ...points.map((p) => p.conducted));
  const maxCash = Math.max(1, ...points.map((p) => p.cash));

  const xFor = (i: number) => PAD_LEFT + (points.length > 1 ? (i / (points.length - 1)) * PLOT_W : PLOT_W / 2);
  const yForConducted = (v: number) => PAD_TOP + PLOT_H - (v / maxConducted) * PLOT_H;
  const yForCash = (v: number) => PAD_TOP + PLOT_H - (v / maxCash) * PLOT_H;

  const conductedPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yForConducted(p.conducted)}`).join(" ");
  const cashPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yForCash(p.cash)}`).join(" ");

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = points.length > 1 ? (x - PAD_LEFT) / PLOT_W : 0;
    const idx = Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1))));
    setHoverIndex(idx);
  }

  const hover = hoverIndex !== null ? points[hoverIndex] : null;
  const totalCash = points.reduce((s, p) => s + p.cash, 0);
  const totalConducted = points.reduce((s, p) => s + p.conducted, 0);
  const tooltipOnLeftHalf = hoverIndex !== null && hoverIndex > points.length / 2;

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[0.8rem] font-bold">Calls conducted &amp; cash collected — last 30 days</h2>
        <div className="flex items-center gap-4 text-[0.72rem] text-text-dim">
          <LegendKey color={CONDUCTED_COLOR} label={`${totalConducted} conducted`} />
          <LegendKey color={CASH_COLOR} label={`$${totalCash.toLocaleString()} collected`} />
        </div>
      </div>

      {points.length === 0 ? (
        <p className="text-[0.8rem] text-text-faint">No calls logged yet.</p>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full touch-none"
            onPointerMove={handleMove}
            onPointerLeave={() => setHoverIndex(null)}
          >
            {[0, 0.5, 1].map((f) => (
              <line
                key={f}
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={PAD_TOP + PLOT_H * f}
                y2={PAD_TOP + PLOT_H * f}
                stroke="var(--border)"
                strokeWidth={1}
              />
            ))}

            <path d={conductedPath} fill="none" stroke={CONDUCTED_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path d={cashPath} fill="none" stroke={CASH_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {hoverIndex !== null && (
              <>
                <line x1={xFor(hoverIndex)} x2={xFor(hoverIndex)} y1={PAD_TOP} y2={PAD_TOP + PLOT_H} stroke="var(--text-faint)" strokeWidth={1} />
                <circle cx={xFor(hoverIndex)} cy={yForConducted(points[hoverIndex].conducted)} r={4} fill={CONDUCTED_COLOR} stroke="var(--surface)" strokeWidth={2} />
                <circle cx={xFor(hoverIndex)} cy={yForCash(points[hoverIndex].cash)} r={4} fill={CASH_COLOR} stroke="var(--surface)" strokeWidth={2} />
              </>
            )}
          </svg>

          {hover && hoverIndex !== null && (
            <div
              className="pointer-events-none absolute top-0 min-w-[9rem] rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[0.72rem] shadow-lg"
              style={{
                left: `${(xFor(hoverIndex) / WIDTH) * 100}%`,
                transform: tooltipOnLeftHalf ? "translateX(-108%)" : "translateX(8%)",
              }}
            >
              <div className="mb-1 font-mono text-text-faint">{hover.date}</div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: CONDUCTED_COLOR }} />
                <span className="font-mono font-bold text-foreground">{hover.conducted}</span>
                <span className="text-text-faint">conducted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: CASH_COLOR }} />
                <span className="font-mono font-bold text-foreground">${hover.cash.toLocaleString()}</span>
                <span className="text-text-faint">collected</span>
              </div>
            </div>
          )}

          <div className="mt-1 flex justify-between text-[0.68rem] text-text-faint">
            <span>{points[0]?.date}</span>
            <span>{points[points.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
