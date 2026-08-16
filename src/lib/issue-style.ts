// Shared color helpers for Issue cards/board — mirrors project-style.ts so
// Issues and Projects read as one consistent color system.

export const ISSUE_STATUS_STYLE: Record<string, { bar: string; wash: string; text: string }> = {
  backlog: { bar: "#64748B", wash: "rgba(100,116,139,0.10)", text: "#94A3B8" },
  todo: { bar: "#3B82F6", wash: "rgba(59,130,246,0.10)", text: "#60A5FA" },
  in_progress: { bar: "#8B5CF6", wash: "rgba(139,92,246,0.10)", text: "#A78BFA" },
  done: { bar: "#22C55E", wash: "rgba(34,197,94,0.10)", text: "#4ADE80" },
  canceled: { bar: "#EF4444", wash: "rgba(239,68,68,0.10)", text: "#F87171" },
};

const AVATAR_PALETTE = [
  "#F43F5E",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

/** Deterministic color per assignee, so the same person always gets the same avatar color. */
export function assigneeColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
