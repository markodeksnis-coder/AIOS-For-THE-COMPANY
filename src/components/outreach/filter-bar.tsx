import Link from "next/link";
import { cn } from "@/lib/utils";

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "all", label: "All-time" },
] as const;

/** Range/setter/source filter chips shared by the Cold Outbound and
 *  Appointment Reporting pages — plain links that toggle one query param
 *  while preserving the others, so filters are shareable/bookmarkable URLs
 *  instead of client-side-only state. */
export function FilterBar({
  basePath,
  range,
  setter,
  source,
  setters,
  sources,
}: {
  basePath: string;
  range: string;
  setter: string;
  source: string;
  setters: readonly string[];
  sources: readonly string[];
}) {
  const buildHref = (next: { range?: string; setter?: string; source?: string }) => {
    const params = new URLSearchParams();
    const r = next.range ?? range;
    const s = next.setter ?? setter;
    const src = next.source ?? source;
    if (r !== "30") params.set("range", r);
    if (s !== "all") params.set("setter", s);
    if (src !== "all") params.set("source", src);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <ChipGroup label="Range">
        {RANGES.map((r) => (
          <Chip key={r.value} active={r.value === range} href={buildHref({ range: r.value })}>
            {r.label}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup label="Setter">
        <Chip active={setter === "all"} href={buildHref({ setter: "all" })}>
          All
        </Chip>
        {setters.map((s) => (
          <Chip key={s} active={setter === s} href={buildHref({ setter: s })}>
            {s}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup label="Source">
        <Chip active={source === "all"} href={buildHref({ source: "all" })}>
          All
        </Chip>
        {sources.map((s) => (
          <Chip key={s} active={source === s} href={buildHref({ source: s })}>
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
