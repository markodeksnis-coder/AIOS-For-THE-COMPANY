import { describe, it, expect } from "vitest";
import { parseTags, parseLinks, parseYamlBody, stripWikilink, resolveWikilinks, sortByDepartmentPriority, DEPARTMENT_ORDER } from "@/lib/brain";
import type { BrainFile } from "@prisma/client";

function file(overrides: Partial<BrainFile> = {}): BrainFile {
  return {
    id: "f1",
    slug: "some-file",
    title: "Some File",
    type: "doc",
    department: null,
    status: "active",
    tags: "[]",
    links: "[]",
    body: "",
    excerpt: null,
    updated: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as BrainFile;
}

describe("parseTags / parseLinks", () => {
  it("parses the JSON-encoded tags array", () => {
    expect(parseTags(file({ tags: '["sales", "onboarding"]' }))).toEqual(["sales", "onboarding"]);
  });

  it("parses the JSON-encoded links array", () => {
    expect(parseLinks(file({ links: '["marko", "company"]' }))).toEqual(["marko", "company"]);
  });
});

describe("parseYamlBody", () => {
  it("returns null for a type that doesn't store YAML in its body", () => {
    expect(parseYamlBody(file({ type: "doc", body: "mission: hello" }))).toBeNull();
  });

  it("parses real YAML for a department file", () => {
    const result = parseYamlBody(file({ type: "department", body: 'mission: "Grow the business"\nkpis:\n  - name: "Close rate"\n' }));
    expect(result).toMatchObject({ mission: "Grow the business", kpis: [{ name: "Close rate" }] });
  });

  it("returns null (never throws) on malformed YAML", () => {
    expect(parseYamlBody(file({ type: "company", body: "mission: [unclosed" }))).toBeNull();
  });

  it("returns null (never throws) for an empty YAML body — js-yaml treats empty input as an error", () => {
    expect(parseYamlBody(file({ type: "course", body: "" }))).toBeNull();
  });

  it("returns an empty object rather than null for a literal YAML null document", () => {
    expect(parseYamlBody(file({ type: "course", body: "null" }))).toEqual({});
  });
});

describe("stripWikilink", () => {
  it("strips the [[ ]] wrapper", () => {
    expect(stripWikilink("[[marko]]")).toBe("marko");
  });

  it("trims surrounding whitespace", () => {
    expect(stripWikilink("  [[marko]]  ")).toBe("marko");
  });

  it("is a no-op on a plain string", () => {
    expect(stripWikilink("marko")).toBe("marko");
  });
});

describe("resolveWikilinks", () => {
  it("replaces a [[slug]] with a markdown link using the known title", () => {
    const titles = new Map([["marko", "Marko Deksnis"]]);
    expect(resolveWikilinks("Owned by [[marko]].", titles)).toBe("Owned by [Marko Deksnis](/docs/marko).");
  });

  it("falls back to the slug itself as the link text when the title is unknown", () => {
    expect(resolveWikilinks("See [[some-doc]].", new Map())).toBe("See [some-doc](/docs/some-doc).");
  });

  it("replaces every occurrence", () => {
    const titles = new Map([["a", "A"], ["b", "B"]]);
    expect(resolveWikilinks("[[a]] and [[b]] and [[a]] again", titles)).toBe(
      "[A](/docs/a) and [B](/docs/b) and [A](/docs/a) again"
    );
  });

  it("leaves text with no wikilinks unchanged", () => {
    expect(resolveWikilinks("plain text", new Map())).toBe("plain text");
  });
});

describe("sortByDepartmentPriority", () => {
  it("orders items by DEPARTMENT_ORDER regardless of input order", () => {
    const items = [{ department: "finance" }, { department: "ceo" }, { department: "sales" }];
    expect(sortByDepartmentPriority(items).map((i) => i.department)).toEqual(["ceo", "sales", "finance"]);
  });

  it("puts an unknown or missing department last", () => {
    const items = [{ department: "unknown-dept" }, { department: "ceo" }, { department: null }];
    const result = sortByDepartmentPriority(items).map((i) => i.department);
    expect(result[0]).toBe("ceo");
    expect(result.slice(1)).toEqual(expect.arrayContaining(["unknown-dept", null]));
  });

  it("does not mutate the input array", () => {
    const items = [{ department: "finance" }, { department: "ceo" }];
    const original = [...items];
    sortByDepartmentPriority(items);
    expect(items).toEqual(original);
  });

  it("preserves DEPARTMENT_ORDER's own listed order end to end", () => {
    const shuffled = [...DEPARTMENT_ORDER].reverse().map((department) => ({ department }));
    expect(sortByDepartmentPriority(shuffled).map((i) => i.department)).toEqual(DEPARTMENT_ORDER);
  });
});
