import { db } from "@/lib/db";
import { IssueList } from "@/components/issues/issue-list";

// Live work data — never statically cache this, unlike the /brain-backed
// pages which only change on redeploy.
export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  const [issues, people, projects] = await Promise.all([
    db.issue.findMany({
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    }),
    db.brainFile.findMany({ where: { type: "person" }, select: { slug: true, title: true } }),
    db.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Work · Issues
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Issues</h1>
        <p className="mt-1 text-[0.88rem] text-text-dim">
          {issues.length} total. Real, persisted, editable — this is live data, not /brain.
        </p>
      </div>
      <IssueList issues={issues} people={people} projects={projects} />
    </div>
  );
}
