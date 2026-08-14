// Shared vocabulary for Issues/Projects — one place so the UI, Server
// Actions, and any future validation all agree on the same values.

export const ISSUE_STATUSES = ["backlog", "todo", "in_progress", "done", "canceled"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  canceled: "Canceled",
};

export const ISSUE_PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  none: "No priority",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PROJECT_STATUSES = ["planning", "active", "paused", "done"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  paused: "Paused",
  done: "Done",
};

export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  if (status === "done" || status === "canceled") return false;
  return new Date(dueDate + "T23:59:59") < new Date();
}
