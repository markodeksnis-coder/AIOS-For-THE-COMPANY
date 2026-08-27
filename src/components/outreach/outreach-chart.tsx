"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import type { OutreachSeriesPoint } from "@/lib/outreach";

/** Two-metric daily area chart for the outreach dashboard — same geometry,
 *  hover behaviour, and legend treatment as CallsCashChart so the two
 *  dashboards read as one system. The page decides what the two series
 *  mean (see `dailySeries` in lib/outreach.ts); this only draws them. */

const WIDTH = 720;
const HEIGHT = 180;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 8;
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

const PRIMARY_COLOR = "var(--graph-people)";
const SECONDARY_COLOR = "var(--graph-work)";

export function OutreachChart({
  title,
  points,
  primaryLabel,
  secondaryLabel,
}: {
  title: string;
  points: OutreachSeriesPoint[];
  primaryLabel: string;
  secondaryLabel: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const maxPrimary = Math.max(1, ...points.map((p) => p.primary));
  const maxSecondary = Math.max(1, ...points.map((p) => p.secondary));

  const xFor = (i: number) =>
    PAD_LEFT + (points.length > 1 ? (i / (points.length - 1)) * PLOT_W : PLOT_W / 2);
  const yFor = (v: number, max: number) => PAD_TOP + PLOT_H - (v / max) * PLOT_H;

  const pathFor = (key: "primary" | "secondary", max: number) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p[key], max)}`).join(" ");

  const floorY = PAD_TOP + PLOT_H;
  const areaFor = (path: string) =>
    points.length > 0 ? `${path} L${xFor(points.length - 1)},${floorY} L${xFor(0)},${floorY} Z` : "";

  const primaryPath = pathFor("primary", maxPrimary);
  const secondaryPath = pathFor("secondary", maxSecondary);

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
  const totalPrimary = points.reduce((s, p) => s + p.primary, 0);
  const totalSecondary = points.reduce((s, p) => s + p.secondary, 0);
  const tooltipOnLeftHalf = hoverIndex !== null && hoverIndex > points.length / 2;

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[0.8rem] font-bold">{title}</h2>
        <div className="flex items-center gap-4 text-[0.72rem] text-text-dim">
          <LegendKey color={PRIMARY_COLOR} label={`${totalPrimary.toLocaleString()} ${primaryLabel}`} />
          <LegendKey color={SECONDARY_COLOR} label={`${totalSecondary.toLocaleString()} ${secondaryLabel}`} />
        </div>
      </div>

      {points.length === 0 ? (
        <p className="text-[0.8rem] text-text-faint">Nothing logged in this period yet.</p>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full touch-none"
            onPointerMove={handleMove}
            onPointerLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="outreachPrimaryFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PRIMARY_COLOR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={PRIMARY_COLOR} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outreachSecondaryFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SECONDARY_COLOR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={SECONDARY_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>

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

            <path d={areaFor(primaryPath)} fill="url(#outreachPrimaryFill)" stroke="none" />
            <path d={areaFor(secondaryPath)} fill="url(#outreachSecondaryFill)" stroke="none" />
            <path d={primaryPath} fill="none" stroke={PRIMARY_COLOR} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            <path d={secondaryPath} fill="none" stroke={SECONDARY_COLOR} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

            {hoverIndex !== null && (
              <>
                <line
                  x1={xFor(hoverIndex)}
                  x2={xFor(hoverIndex)}
                  y1={PAD_TOP}
                  y2={PAD_TOP + PLOT_H}
                  stroke="var(--text-faint)"
                  strokeWidth={1}
                />
                <circle
                  cx={xFor(hoverIndex)}
                  cy={yFor(points[hoverIndex].primary, maxPrimary)}
                  r={5}
                  fill={PRIMARY_COLOR}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
                <circle
                  cx={xFor(hoverIndex)}
                  cy={yFor(points[hoverIndex].secondary, maxSecondary)}
                  r={5}
                  fill={SECONDARY_COLOR}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
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
                <span className="inline-block h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: PRIMARY_COLOR }} />
                <span className="font-mono font-bold text-foreground">{hover.primary.toLocaleString()}</span>
                <span className="text-text-faint">{primaryLabel}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: SECONDARY_COLOR }} />
                <span className="font-mono font-bold text-foreground">{hover.secondary.toLocaleString()}</span>
                <span className="text-text-faint">{secondaryLabel}</span>
              </div>
            </div>
          )}

          <div className="mt-1 flex justify-between text-[0.68rem] text-text-faint">
            <span className="font-mono">{points[0]?.date}</span>
            <span className="font-mono">{points[points.length - 1]?.date}</span>
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
