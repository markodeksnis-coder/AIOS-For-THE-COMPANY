import { describe, it, expect } from "vitest";
import { sortEntries, trend } from "./scorecards";
import type { ScorecardEntry } from "@prisma/client";

function entry(period: string, value: number): ScorecardEntry {
  return {
    id: period,
    department: "sales",
    kpiName: "Test KPI",
    period,
    value,
    note: null,
    createdAt: new Date(),
  };
}

describe("sortEntries", () => {
  it("sorts most recent period first", () => {
    const entries = [entry("2026-01-01", 10), entry("2026-03-01", 30), entry("2026-02-01", 20)];
    expect(sortEntries(entries).map((e) => e.period)).toEqual(["2026-03-01", "2026-02-01", "2026-01-01"]);
  });

  it("does not mutate the input array", () => {
    const entries = [entry("2026-01-01", 10), entry("2026-02-01", 20)];
    const original = [...entries];
    sortEntries(entries);
    expect(entries).toEqual(original);
  });

  it("handles an empty list", () => {
    expect(sortEntries([])).toEqual([]);
  });
});

describe("trend", () => {
  it("is null with fewer than two entries", () => {
    expect(trend([])).toBeNull();
    expect(trend([entry("2026-01-01", 10)])).toBeNull();
  });

  it("is up when the latest period's value is higher than the previous", () => {
    expect(trend([entry("2026-01-01", 10), entry("2026-02-01", 20)])).toBe("up");
  });

  it("is down when the latest period's value is lower than the previous", () => {
    expect(trend([entry("2026-01-01", 20), entry("2026-02-01", 10)])).toBe("down");
  });

  it("is flat when the latest two periods have the same value", () => {
    expect(trend([entry("2026-01-01", 15), entry("2026-02-01", 15)])).toBe("flat");
  });

  it("compares the two most recent periods regardless of input order", () => {
    const entries = [entry("2026-01-01", 10), entry("2026-03-01", 5), entry("2026-02-01", 20)];
    // most recent is 2026-03-01 (5), previous is 2026-02-01 (20) -> down
    expect(trend(entries)).toBe("down");
  });
});
