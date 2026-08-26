import { describe, expect, it } from "vitest";
import { categoryForType, layoutGraph, type GraphInput } from "@/lib/graph";

describe("categoryForType", () => {
  it("classifies the company root as its own category", () => {
    expect(categoryForType("company")).toBe("company");
  });

  it("classifies a person as people", () => {
    expect(categoryForType("person")).toBe("people");
  });

  it.each(["department", "agent", "app", "project"])("classifies %s as work", (type) => {
    expect(categoryForType(type)).toBe("work");
  });

  it("falls back to knowledge for anything else", () => {
    expect(categoryForType("doc")).toBe("knowledge");
    expect(categoryForType("system")).toBe("knowledge");
    expect(categoryForType("something-unrecognized")).toBe("knowledge");
  });
});

describe("layoutGraph", () => {
  const files: GraphInput[] = [
    { slug: "company", title: "Company", type: "company", links: ["marko"] },
    { slug: "marko", title: "Marko", type: "person", links: ["company"] },
    { slug: "sales", title: "Sales", type: "department", links: ["marko"] },
    { slug: "orphan", title: "Orphan", type: "doc", links: [] },
  ];
  const width = 800;
  const height: number = 600;

  it("produces one node per input file", () => {
    const { nodes } = layoutGraph(files, width, height);
    expect(nodes).toHaveLength(files.length);
    expect(new Set(nodes.map((n) => n.id))).toEqual(new Set(files.map((f) => f.slug)));
  });

  it("keeps every node's position within the given bounds", () => {
    const { nodes } = layoutGraph(files, width, height);
    for (const n of nodes) {
      expect(n.x).toBeGreaterThanOrEqual(20);
      expect(n.x).toBeLessThanOrEqual(width - 20);
      expect(n.y).toBeGreaterThanOrEqual(20);
      expect(n.y).toBeLessThanOrEqual(height - 20);
    }
  });

  it("is deterministic across runs on the same input", () => {
    const first = layoutGraph(files, width, height);
    const second = layoutGraph(files, width, height);
    expect(second.nodes).toEqual(first.nodes);
    expect(second.edges).toEqual(first.edges);
  });

  it("only creates edges for links that resolve to another known file", () => {
    const { edges } = layoutGraph(files, width, height);
    // "orphan" has no links, and every link above points at a real slug —
    // so exactly the 3 declared links become edges.
    expect(edges).toHaveLength(3);
    for (const e of edges) {
      expect(files.some((f) => f.slug === e.source)).toBe(true);
      expect(files.some((f) => f.slug === e.target)).toBe(true);
    }
  });

  it("drops a link that points at an unknown slug", () => {
    const withDanglingLink: GraphInput[] = [
      { slug: "a", title: "A", type: "doc", links: ["does-not-exist"] },
      { slug: "b", title: "B", type: "doc", links: [] },
    ];
    const { edges, nodes } = layoutGraph(withDanglingLink, width, height);
    expect(edges).toHaveLength(0);
    expect(nodes.find((n) => n.id === "a")?.degree).toBe(0);
  });

  it("drops a self-link and does not count it toward degree", () => {
    const selfLinked: GraphInput[] = [{ slug: "a", title: "A", type: "doc", links: ["a"] }];
    const { edges, nodes } = layoutGraph(selfLinked, width, height);
    expect(edges).toHaveLength(0);
    expect(nodes[0].degree).toBe(0);
  });

  it("counts degree on both ends of an edge", () => {
    const pair: GraphInput[] = [
      { slug: "a", title: "A", type: "doc", links: ["b"] },
      { slug: "b", title: "B", type: "doc", links: [] },
    ];
    const { nodes } = layoutGraph(pair, width, height);
    expect(nodes.find((n) => n.id === "a")?.degree).toBe(1);
    expect(nodes.find((n) => n.id === "b")?.degree).toBe(1);
  });

  it("handles an empty file list without throwing", () => {
    const { nodes, edges } = layoutGraph([], width, height);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });
});
