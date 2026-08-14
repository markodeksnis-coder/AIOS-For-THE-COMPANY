import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { StatusPill, PriorityBadge } from "@/components/issues/badges";
import { isOverdue } from "@/lib/work";

export const dynamic = "force-dynamic";

const OPEN_STATUSES = ["backlog", "todo", "in_progress"];

// No auth yet (see brain/README.md) — Marko is the only real person, so
// "assigned to me" means assignee === "marko" until accounts exist.
const ME = "marko";

function IssueRow({ issue }: { issue: { id: string; title: string; status: string; priority: string; dueDate: string | null } }) {
  return (
    <Link
      href={`/issues/${issue.id}`}
      className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] transition-colors last:border-b-0 hover:bg-surface-hover"
    >
      <StatusPill status={issue.status} />
      <span className="flex-1 truncate font-bold">{issue.title}</span>
      {issue.dueDate && <span className="font-mono text-[0.68rem] text-text-faint">{issue.dueDate}</span>}
      <PriorityBadge priority={issue.priority} />
    </Link>
  );
}

export default async function InboxPage() {
  const openIssues = await db.issue.findMany({
    where: { status: { in: OPEN_STATUSES } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const overdue = openIssues.filter((i) => isOverdue(i.dueDate, i.status));
  const overdueIds = new Set(overdue.map((i) => i.id));
  const mine = openIssues.filter((i) => i.assignee === ME && !overdueIds.has(i.id));
  const unassigned = openIssues.filter((i) => !i.assignee && !overdueIds.has(i.id));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Work · Inbox
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">What needs you today</h1>
        <p className="mt-1 text-[0.88rem] text-text-dim">
          Pulled live from Issues — overdue first, then what&apos;s assigned to you, then anything
          open and unassigned.
        </p>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-critical">
          Overdue ({overdue.length})
        </h2>
        {overdue.length > 0 ? (
          <Card className="overflow-hidden">
            {overdue.map((i) => (
              <IssueRow key={i.id} issue={i} />
            ))}
          </Card>
        ) : (
          <p className="text-[0.8rem] text-text-faint">Nothing overdue.</p>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
          Assigned to you ({mine.length})
        </h2>
        {mine.length > 0 ? (
          <Card className="overflow-hidden">
            {mine.map((i) => (
              <IssueRow key={i.id} issue={i} />
            ))}
          </Card>
        ) : (
          <p className="text-[0.8rem] text-text-faint">Nothing assigned to you right now.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
          Open &amp; unassigned ({unassigned.length})
        </h2>
        {unassigned.length > 0 ? (
          <Card className="overflow-hidden">
            {unassigned.map((i) => (
              <IssueRow key={i.id} issue={i} />
            ))}
          </Card>
        ) : (
          <p className="text-[0.8rem] text-text-faint">Nothing waiting on triage.</p>
        )}
      </section>
    </div>
  );
}
