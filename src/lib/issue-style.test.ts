import { describe, it, expect } from "vitest";
import { assigneeColor, initials } from "@/lib/issue-style";

describe("assigneeColor", () => {
  it("is deterministic for the same name", () => {
    expect(assigneeColor("Marko")).toBe(assigneeColor("Marko"));
  });

  it("returns a hex color string", () => {
    expect(assigneeColor("Marko")).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

describe("initials", () => {
  it("takes the first two letters of a single-word name", () => {
    expect(initials("Marko")).toBe("MA");
  });

  it("takes the first letter of the first and last word for a multi-word name", () => {
    expect(initials("Marko Deksnis")).toBe("MD");
    expect(initials("Marko Van Deksnis")).toBe("MD");
  });

  it("collapses extra internal whitespace", () => {
    expect(initials("Marko   Deksnis")).toBe("MD");
  });

  it("ignores leading/trailing whitespace", () => {
    expect(initials("  Marko Deksnis  ")).toBe("MD");
  });
});
