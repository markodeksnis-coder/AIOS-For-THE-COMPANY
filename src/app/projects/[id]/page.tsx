import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ProjectEditForm } from "@/components/projects/project-edit-form";
import { StatusPill, PriorityBadge } from "@/components/issues/badges";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
    include: { issues: { orderBy: { createdAt: "desc" } } },
  });

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/projects" className="mb-4 inline-block text-[0.8rem] text-text-dim hover:text-accent">
        ← All projects
      </Link>

      <Card className="mb-6 p-5">
        <ProjectEditForm project={project} />
      </Card>

      <section>
        <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
          Issues in this project ({project.issues.length})
        </h2>
        <Card className="overflow-hidden">
          {project.issues.length === 0 && (
            <div className="px-4 py-6 text-center text-[0.83rem] text-text-faint">
              No issues linked yet.
            </div>
          )}
          {project.issues.map((issue) => (
            <Link
              key={issue.id}
              href={`/issues/${issue.id}`}
              className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] transition-colors last:border-b-0 hover:bg-surface-hover"
            >
              <StatusPill status={issue.status} />
              <span className="flex-1 truncate font-bold">{issue.title}</span>
              <PriorityBadge priority={issue.priority} />
            </Link>
          ))}
        </Card>
      </section>
    </div>
  );
}
