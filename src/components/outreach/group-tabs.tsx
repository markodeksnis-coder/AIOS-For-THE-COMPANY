import Link from "next/link";
import { cn } from "@/lib/utils";
import { GROUP_BYS, type GroupBy } from "@/lib/outreach";
import { hrefWith, type DashboardParams } from "@/lib/outreach-url";

const LABELS: Record<GroupBy, string> = {
  setter: "By setter",
  source: "By source",
  day: "By day",
  rows: "All rows",
};

/** The group-by switch above the breakdown table — plain links that swap
 *  one query param, same pattern as FilterBar. `rowsLabel` lets the
 *  Appointment Reporting tab call the raw-row view "Logged days" while
 *  Cold Outbound calls it "All activity". */
export function GroupTabs({
  basePath,
  params,
  rowsLabel,
}: {
  basePath: string;
  params: DashboardParams;
  rowsLabel?: string;
}) {
  return (
    <div className="flex gap-1">
      {GROUP_BYS.map((g) => (
        <Link
          key={g}
          href={hrefWith(basePath, params, { group: g, drill: null })}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold transition-colors",
            g === params.group
              ? "border-accent bg-accent-wash text-accent-strong"
              : "border-border text-text-faint hover:border-accent hover:text-foreground"
          )}
        >
          {g === "rows" ? (rowsLabel ?? LABELS.rows) : LABELS[g]}
        </Link>
      ))}
    </div>
  );
}
