// URL state for the dashboard tabs. Every filter, the group-by switch, and
// the drill-down selection all live in query params — same reasoning as
// FilterBar's original comment: filters stay shareable/bookmarkable URLs
// instead of client-side-only state, and the pages stay server components.

import { GROUP_BYS, type GroupBy } from "@/lib/outreach";

export type DashboardParams = {
  range: string; // "7" | "30" | "90" | "all"
  setter: string; // "all" | a SETTERS value
  source: string; // "all" | a SOURCES value
  group: GroupBy;
  drill: string | null; // "<field>:<key>", e.g. "setter:Marko" or "day:2026-08-27"
};

export const DEFAULTS = { range: "30", setter: "all", source: "all", group: "setter" as GroupBy };

export type RawSearchParams = {
  range?: string;
  setter?: string;
  source?: string;
  group?: string;
  drill?: string;
};

export function readParams(raw: RawSearchParams): DashboardParams {
  const group = GROUP_BYS.includes(raw.group as GroupBy) ? (raw.group as GroupBy) : DEFAULTS.group;
  return {
    range: raw.range ?? DEFAULTS.range,
    setter: raw.setter ?? DEFAULTS.setter,
    source: raw.source ?? DEFAULTS.source,
    group,
    drill: raw.drill ?? null,
  };
}

/** Builds an href that changes one or more params and preserves the rest.
 *  Params at their default are omitted, so the common case stays a clean
 *  URL. Pass `drill: null` to close the drill-down rail. */
export function hrefWith(
  basePath: string,
  current: DashboardParams,
  next: Partial<DashboardParams>
): string {
  const merged = { ...current, ...next };
  const params = new URLSearchParams();
  if (merged.range !== DEFAULTS.range) params.set("range", merged.range);
  if (merged.setter !== DEFAULTS.setter) params.set("setter", merged.setter);
  if (merged.source !== DEFAULTS.source) params.set("source", merged.source);
  if (merged.group !== DEFAULTS.group) params.set("group", merged.group);
  if (merged.drill) params.set("drill", merged.drill);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** The `date >= ` bound for a range param — null means all-time. */
export function sinceFor(range: string): string | null {
  if (range === "all") return null;
  return new Date(Date.now() - (Number(range) - 1) * 86_400_000).toISOString().slice(0, 10);
}

export type Drill = { field: "setter" | "source" | "date" | "id"; key: string };

export function parseDrill(drill: string | null): Drill | null {
  if (!drill) return null;
  const idx = drill.indexOf(":");
  if (idx < 1) return null;
  const rawField = drill.slice(0, idx);
  const key = drill.slice(idx + 1);
  const field =
    rawField === "day" ? "date" : rawField === "setter" || rawField === "source" || rawField === "id" ? rawField : null;
  if (!field || !key) return null;
  return { field, key };
}
