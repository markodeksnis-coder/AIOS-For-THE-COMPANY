import Link from "next/link";
import { cn } from "@/lib/utils";
import { hrefWith, type DashboardParams } from "@/lib/outreach-url";

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "all", label: "All-time" },
] as const;

/** Range/setter/source filter chips shared by the Cold Outbound and
 *  Appointment Reporting pages — plain links that toggle one query param
 *  while preserving the others, so filters are shareable/bookmarkable URLs
 *  instead of client-side-only state.
 *
 *  Href building moved to lib/outreach-url so the group-by switch and the
 *  drill-down rail survive a filter change (they're query params too).
 *  Changing a filter drops `drill` on purpose: the row you'd drilled into
 *  may not exist under the new filter. */
export function FilterBar({
  basePath,
  params,
  setters,
  sources,
}: {
  basePath: string;
  params: DashboardParams;
  setters: readonly string[];
  sources: readonly string[];
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <ChipGroup label="Range">
        {RANGES.map((r) => (
          <Chip
            key={r.value}
            active={r.value === params.range}
            href={hrefWith(basePath, params, { range: r.value, drill: null })}
          >
            {r.label}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup label="Setter">
        <Chip active={params.setter === "all"} href={hrefWith(basePath, params, { setter: "all", drill: null })}>
          All
        </Chip>
        {setters.map((s) => (
          <Chip key={s} active={params.setter === s} href={hrefWith(basePath, params, { setter: s, drill: null })}>
            {s}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup label="Source">
        <Chip active={params.source === "all"} href={hrefWith(basePath, params, { source: "all", drill: null })}>
          All
        </Chip>
        {sources.map((s) => (
          <Chip key={s} active={params.source === s} href={hrefWith(basePath, params, { source: s, drill: null })}>
            {s}
          </Chip>
        ))}
      </ChipGroup>
    </div>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[0.65rem] uppercase tracking-widest text-text-faint">{label}</span>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

function Chip({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold transition-colors",
        active
          ? "border-accent bg-accent-wash text-accent-strong"
          : "border-border text-text-faint hover:border-accent hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
