// Three categorical colors, validated (CVD-safe, all-pairs) against this
// app's actual light/dark surfaces — see dataviz skill. "Company" isn't a
// fourth category: it's a single unique root node, always labeled, so it
// doesn't compete with the categorical identity problem the palette solves.
export type GraphCategory = "company" | "people" | "work" | "knowledge";

const WORK_TYPES = new Set(["department", "agent", "app", "project"]);

export function categoryForType(type: string): GraphCategory {
  if (type === "company") return "company";
  if (type === "person") return "people";
  if (WORK_TYPES.has(type)) return "work";
  return "knowledge";
}

export const CATEGORY_LABELS: Record<GraphCategory, string> = {
  company: "Company",
  people: "People",
  work: "Departments, projects, agents & apps",
  knowledge: "Docs, systems & training",
};

export type GraphNode = {
  id: string; // slug
  title: string;
  category: GraphCategory;
  degree: number;
  x: number;
  y: number;
};

export type GraphEdge = { source: string; target: string };

export type GraphInput = { slug: string; title: string; type: string; links: string[] };

/** Deterministic pseudo-random in [0,1), seeded from a string — so layout
 * doesn't jump around between page loads. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** A small hand-rolled force layout — repulsion + spring edges + centering,
 * run for a fixed number of iterations. Fine for the node counts a single
 * company's /brain will realistically have (tens to a couple hundred). */
export function layoutGraph(
  files: GraphInput[],
  width: number,
  height: number
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const bySlug = new Map(files.map((f) => [f.slug, f]));
  const rand = seededRandom("company-os-graph");

  const degree = new Map<string, number>();
  const edges: GraphEdge[] = [];
  for (const f of files) {
    for (const target of f.links) {
      if (!bySlug.has(target) || target === f.slug) continue;
      edges.push({ source: f.slug, target });
      degree.set(f.slug, (degree.get(f.slug) ?? 0) + 1);
      degree.set(target, (degree.get(target) ?? 0) + 1);
    }
  }

  const nodes: GraphNode[] = files.map((f) => ({
    id: f.slug,
    title: f.title,
    category: categoryForType(f.type),
    degree: degree.get(f.slug) ?? 0,
    x: width / 2 + (rand() - 0.5) * width * 0.8,
    y: height / 2 + (rand() - 0.5) * height * 0.8,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const REPULSION = 2600;
  const SPRING_LENGTH = 90;
  const SPRING_STRENGTH = 0.02;
  const CENTER_STRENGTH = 0.01;
  const DAMPING = 0.85;

  const vx = new Map(nodes.map((n) => [n.id, 0]));
  const vy = new Map(nodes.map((n) => [n.id, 0]));

  for (let iter = 0; iter < 300; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      let fx = (width / 2 - a.x) * CENTER_STRENGTH;
      let fy = (height / 2 - a.y) * CENTER_STRENGTH;

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = Math.max(dx * dx + dy * dy, 1);
        const force = REPULSION / distSq;
        const dist = Math.sqrt(distSq);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      vx.set(a.id, (vx.get(a.id)! + fx) * DAMPING);
      vy.set(a.id, (vy.get(a.id)! + fy) * DAMPING);
    }

    for (const e of edges) {
      const a = byId.get(e.source);
      const b = byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist - SPRING_LENGTH) * SPRING_STRENGTH;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      vx.set(a.id, vx.get(a.id)! + fx);
      vy.set(a.id, vy.get(a.id)! + fy);
      vx.set(b.id, vx.get(b.id)! - fx);
      vy.set(b.id, vy.get(b.id)! - fy);
    }

    for (const n of nodes) {
      n.x += vx.get(n.id)!;
      n.y += vy.get(n.id)!;
      n.x = Math.min(width - 20, Math.max(20, n.x));
      n.y = Math.min(height - 20, Math.max(20, n.y));
    }
  }

  return { nodes, edges };
}
