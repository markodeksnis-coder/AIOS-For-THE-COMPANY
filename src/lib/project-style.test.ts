import { describe, it, expect } from "vitest";
import { tagColor, parseTags, highestPriority } from "@/lib/project-style";

describe("tagColor", () => {
  it("is deterministic for the same tag", () => {
    expect(tagColor("sales")).toBe(tagColor("sales"));
  });

  it("returns a hex color string", () => {
    expect(tagColor("marketing")).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

describe("parseTags", () => {
  it("parses a JSON array of tags", () => {
    expect(parseTags('["a", "b"]')).toEqual(["a", "b"]);
  });

  it("returns an empty array for malformed JSON rather than throwing", () => {
    expect(parseTags("not json")).toEqual([]);
  });

  it("returns an empty array when the JSON parses to something other than an array", () => {
    expect(parseTags('{"a": 1}')).toEqual([]);
    expect(parseTags('"just a string"')).toEqual([]);
  });
});

describe("highestPriority", () => {
  it("returns null for an empty list", () => {
    expect(highestPriority([])).toBeNull();
  });

  it("returns null when nothing is above 'low' (medium+ only, per its own contract)", () => {
    expect(highestPriority([{ priority: "low" }, { priority: "none" }])).toBeNull();
  });

  it("returns the single medium-or-above priority present", () => {
    expect(highestPriority([{ priority: "low" }, { priority: "medium" }])).toBe("medium");
  });

  it("returns the highest-ranked priority among several", () => {
    expect(highestPriority([{ priority: "medium" }, { priority: "urgent" }, { priority: "high" }])).toBe("urgent");
  });

  it("treats an unknown priority string as rank 0 rather than throwing", () => {
    expect(highestPriority([{ priority: "not-a-real-priority" }, { priority: "high" }])).toBe("high");
  });
});
