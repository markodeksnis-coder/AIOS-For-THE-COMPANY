import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** The KPI tile used across all three dashboard tabs — same markup the
 *  original pages had inline, lifted out so Overview/Cold Outbound/
 *  Appointment Reporting can't drift apart. `pending` marks a metric whose
 *  column doesn't carry data yet (see `messagesSeen` before the first
 *  daily check-in is logged) so an empty tile reads as "not wired" rather
 *  than "zero". */
export function StatTile({
  label,
  value,
  sub,
  good,
  pending,
}: {
  label: string;
  value: string;
  sub?: string;
  good?: boolean;
  pending?: boolean;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 text-[0.68rem] text-text-faint">{label}</div>
        {pending && <Badge variant="sample">no data</Badge>}
      </div>
      <div className={cn("mt-0.5 font-mono text-[1.1rem] font-bold", good ? "text-good" : "text-foreground")}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[0.68rem] text-text-faint">{sub}</div>}
    </Card>
  );
}

export type Column = {
  label: string;
  align?: "right";
  /** Renders the cell. Returning a string is the common case; returning a
   *  node lets a page colour one number without this file knowing why. */
  cell: (row: never) => React.ReactNode;
  mono?: boolean;
  strong?: boolean;
};

/** One breakdown table with optional per-row drill-down links. Rows are
 *  plain <Link>s when `hrefFor` is given, so drilling in is a real URL
 *  (shareable, back-button-able) instead of client state. */
export function BreakdownTable<T>({
  rows,
  columns,
  hrefFor,
  activeKey,
  keyFor,
  empty,
  footNote,
}: {
  rows: T[];
  columns: {
    label: string;
    align?: "right";
    mono?: boolean;
    strong?: boolean;
    good?: boolean;
    cell: (row: T) => React.ReactNode;
  }[];
  hrefFor?: (row: T) => string;
  activeKey?: string | null;
  keyFor: (row: T) => string;
  empty: string;
  footNote?: string;
}) {
  if (rows.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-[0.8rem] text-text-faint">{empty}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto p-4">
      <table className="w-full text-[0.78rem]">
        <thead>
          <tr className="border-b border-border text-left text-text-faint">
            {columns.map((c) => (
              <th key={c.label} className={cn("pb-1.5 font-medium", c.align === "right" && "text-right")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = keyFor(row);
            const href = hrefFor?.(row);
            const active = activeKey != null && activeKey === key;
            return (
              <tr
                key={key}
                className={cn(
                  "border-b border-border last:border-b-0",
                  href && "transition-colors hover:bg-surface-hover",
                  active && "bg-accent-wash"
                )}
              >
                {columns.map((c, i) => (
                  <td
                    key={c.label}
                    className={cn(
                      "py-1.5",
                      c.align === "right" && "text-right",
                      c.mono && "font-mono",
                      c.strong && "font-semibold",
                      c.good && "font-bold text-good"
                    )}
                  >
                    {href && i === 0 ? (
                      <Link href={href} className="flex items-center gap-1.5 text-foreground hover:text-accent-strong">
                        {c.cell(row)}
                        <span className="text-text-faint">›</span>
                      </Link>
                    ) : (
                      c.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {footNote && <p className="mt-3 text-[0.72rem] text-text-faint">{footNote}</p>}
    </Card>
  );
}
