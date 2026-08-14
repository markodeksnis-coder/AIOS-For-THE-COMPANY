import { Badge } from "@/components/ui/badge";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  type IssuePriority,
  type IssueStatus,
  type ProjectStatus,
} from "@/lib/work";

const STATUS_DOT: Record<IssueStatus, string> = {
  backlog: "bg-text-faint",
  todo: "bg-text-dim",
  in_progress: "bg-accent",
  done: "bg-good",
  canceled: "bg-critical",
};

export function StatusPill({ status }: { status: string }) {
  const s = status as IssueStatus;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.7rem] text-text-dim">
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s] ?? "bg-text-faint"}`} />
      {ISSUE_STATUS_LABELS[s] ?? status}
    </span>
  );
}

const PRIORITY_VARIANT: Record<IssuePriority, "default" | "sample" | "good" | "accent"> = {
  none: "default",
  low: "default",
  medium: "accent",
  high: "sample",
  urgent: "sample",
};

export function PriorityBadge({ priority }: { priority: string }) {
  const p = priority as IssuePriority;
  if (p === "none") return null;
  return <Badge variant={PRIORITY_VARIANT[p] ?? "default"}>{ISSUE_PRIORITY_LABELS[p] ?? priority}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: string }) {
  const s = status as ProjectStatus;
  const variant = s === "active" ? "accent" : s === "done" ? "good" : "default";
  return <Badge variant={variant}>{PROJECT_STATUS_LABELS[s] ?? status}</Badge>;
}
