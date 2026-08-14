"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { layoutGraph, CATEGORY_LABELS, type GraphInput, type GraphCategory } from "@/lib/graph";

const WIDTH = 1100;
const HEIGHT = 640;

const CATEGORY_COLOR: Record<GraphCategory, string> = {
  company: "var(--color-accent)",
  people: "var(--color-graph-people)",
  work: "var(--color-graph-work)",
  knowledge: "var(--color-graph-knowledge)",
};

function radiusFor(degree: number, isCompany: boolean): number {
  if (isCompany) return 14;
  return Math.min(10, 4 + degree * 1.1);
}

export function GraphView({ files }: { files: GraphInput[] }) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes, edges } = useMemo(() => layoutGraph(files, WIDTH, HEIGHT), [files]);

  const connected = useMemo(() => {
    if (!hovered) return null;
    const ids = new Set<string>([hovered]);
    for (const e of edges) {
      if (e.source === hovered) ids.add(e.target);
      if (e.target === hovered) ids.add(e.source);
    }
    return ids;
  }, [hovered, edges]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4">
        {(Object.keys(CATEGORY_LABELS) as GraphCategory[]).map((cat) => (
          <div key={cat} className="flex items-center gap-1.5 text-[0.75rem] text-text-dim">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CATEGORY_COLOR[cat] }}
            />
            {CATEGORY_LABELS[cat]}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          className="min-w-[700px]"
        >
          <g>
            {edges.map((e, i) => {
              const dim = connected && !(connected.has(e.source) && connected.has(e.target));
              return (
                <line
                  key={i}
                  x1={nodes.find((n) => n.id === e.source)?.x}
                  y1={nodes.find((n) => n.id === e.source)?.y}
                  x2={nodes.find((n) => n.id === e.target)?.x}
                  y2={nodes.find((n) => n.id === e.target)?.y}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  opacity={dim ? 0.15 : 0.6}
                />
              );
            })}
          </g>
          <g>
            {nodes.map((n) => {
              const isCompany = n.category === "company";
              const dim = connected && !connected.has(n.id);
              const r = radiusFor(n.degree, isCompany);
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => router.push(`/docs/${n.id}`)}
                  className="cursor-pointer"
                  opacity={dim ? 0.25 : 1}
                >
                  <circle r={r} fill={CATEGORY_COLOR[n.category]} />
                  {isCompany && (
                    <circle r={r + 4} fill="none" stroke={CATEGORY_COLOR[n.category]} strokeWidth={1.5} opacity={0.5} />
                  )}
                  <text
                    y={r + 12}
                    textAnchor="middle"
                    className="pointer-events-none select-none"
                    fontSize={isCompany ? 11 : 9}
                    fontWeight={isCompany || n.degree >= 3 ? 700 : 400}
                    fill="var(--color-text-dim)"
                  >
                    {n.title}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <p className="mt-2 text-[0.78rem] text-text-faint">
        {nodes.length} files, {edges.length} links. Hover a node to see its connections, click to
        open it. Every file here is also listed (searchable, in a plain list) on the{" "}
        <Link href="/docs" className="text-accent hover:underline">
          Docs
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
