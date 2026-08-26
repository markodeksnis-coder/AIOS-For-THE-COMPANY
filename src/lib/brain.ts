import * as yaml from "js-yaml";
import { db } from "@/lib/db";
import type { BrainFile } from "@prisma/client";

export function parseTags(file: BrainFile): string[] {
  return JSON.parse(file.tags) as string[];
}

export function parseLinks(file: BrainFile): string[] {
  return JSON.parse(file.links) as string[];
}

/** Files whose type stores structured data (mission, kpis, team, apps…) as YAML in the body. */
const YAML_BODY_TYPES = new Set(["department", "company", "course"]);

export function parseYamlBody(file: BrainFile): Record<string, unknown> | null {
  if (!YAML_BODY_TYPES.has(file.type)) return null;
  try {
    return (yaml.load(file.body) as Record<string, unknown>) ?? {};
  } catch {
    return null;
  }
}

/** "[[marko]]" (a literal string from a YAML body field) -> "marko" */
export function stripWikilink(s: string): string {
  return s.trim().replace(/^\[\[|\]\]$/g, "").trim();
}

/** Replaces [[slug]] with a real markdown link, using the file's title as link text when known. */
export function resolveWikilinks(body: string, slugToTitle: Map<string, string>): string {
  return body.replace(/\[\[([^\]]+)\]\]/g, (_match, rawSlug) => {
    const slug = String(rawSlug).trim();
    const title = slugToTitle.get(slug) ?? slug;
    return `[${title}](/docs/${slug})`;
  });
}

export async function getBacklinks(slug: string): Promise<BrainFile[]> {
  const all = await db.brainFile.findMany();
  return all.filter((f) => parseLinks(f).includes(slug));
}

export const DEPARTMENT_ORDER = [
  "ceo",
  "marketing",
  "sales",
  "product",
  "human-resources",
  "operations",
  "finance",
];

export function sortByDepartmentPriority<T extends { department?: string | null }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const ai = DEPARTMENT_ORDER.indexOf(a.department ?? "");
    const bi = DEPARTMENT_ORDER.indexOf(b.department ?? "");
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export const DEPARTMENT_LABELS: Record<string, string> = {
  ceo: "CEO",
  marketing: "Marketing",
  sales: "Sales",
  product: "Product",
  "human-resources": "Human Resources",
  operations: "Operations",
  finance: "Finance",
};

export const TYPE_LABELS: Record<string, string> = {
  company: "Company",
  department: "Department",
  doc: "Doc",
  system: "System",
  agent: "Agent",
  app: "App",
  course: "Course",
  lesson: "Lesson",
  project: "Project",
  person: "Person",
  template: "Template",
  meeting: "Meeting",
  decision: "Decision",
  scorecard: "Scorecard",
  playbook: "Playbook",
};
