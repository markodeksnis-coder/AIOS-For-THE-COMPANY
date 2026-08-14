import type { ScorecardEntry } from "@prisma/client";

export type DeptKpi = { name: string; target: string; status?: string };

/** Most recent entry first. */
export function sortEntries(entries: ScorecardEntry[]): ScorecardEntry[] {
  return [...entries].sort((a, b) => b.period.localeCompare(a.period));
}

export function trend(entries: ScorecardEntry[]): "up" | "down" | "flat" | null {
  const sorted = sortEntries(entries);
  if (sorted.length < 2) return null;
  const [latest, previous] = sorted;
  if (latest.value === previous.value) return "flat";
  return latest.value > previous.value ? "up" : "down";
}
