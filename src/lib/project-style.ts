// Shared color helpers for Project cards, the board, and the project detail
// hero — one place so all three stay visually consistent.

export const NEUTRAL_GRADIENT = "linear-gradient(135deg, #64748B, #94A3B8)";

export const PROJECT_STATUS_STYLE: Record<string, { bar: string; wash: string; text: string }> = {
  planning: { bar: "#64748B", wash: "rgba(100,116,139,0.12)", text: "#94A3B8" },
  active: { bar: "#22C55E", wash: "rgba(34,197,94,0.12)", text: "#4ADE80" },
  paused: { bar: "#EAB308", wash: "rgba(234,179,8,0.12)", text: "#FACC15" },
  done: { bar: "#8B5CF6", wash: "rgba(139,92,246,0.12)", text: "#A78BFA" },
};

const TAG_PALETTE = [
  "#F43F5E",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

export function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

export function parseTags(tags: string): string[] {
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const PRIORITY_RANK: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };
export const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#EF4444",
  high: "#F97316",
  medium: "#3B82F6",
};

/** Highest-ranked priority among a project's linked issues, medium+ only. */
export function highestPriority(issues: { priority: string }[]): string | null {
  let top: string | null = null;
  let topRank = 0;
  for (const i of issues) {
    const rank = PRIORITY_RANK[i.priority] ?? 0;
    if (rank > topRank) {
      topRank = rank;
      top = i.priority;
    }
  }
  return topRank > 1 ? top : null;
}
