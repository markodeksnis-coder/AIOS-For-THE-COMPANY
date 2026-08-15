import { db } from "@/lib/db";
import { ProjectsView } from "@/components/projects/projects-view";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    include: { issues: { select: { status: true, priority: true } } },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Work · Projects
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Projects</h1>
        <p className="mt-1 text-[0.88rem] text-text-dim">{projects.length} total.</p>
      </div>
      <ProjectsView projects={projects} />
    </div>
  );
}
