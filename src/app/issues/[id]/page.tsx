import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { IssueEditForm } from "@/components/issues/issue-edit-form";
import { CommentForm } from "@/components/issues/comment-form";

export const dynamic = "force-dynamic";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [issue, people, projects] = await Promise.all([
    db.issue.findUnique({
      where: { id },
      include: { comments: { orderBy: { createdAt: "asc" } } },
    }),
    db.brainFile.findMany({ where: { type: "person" }, select: { slug: true, title: true } }),
    db.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!issue) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/issues" className="mb-4 inline-block text-[0.8rem] text-text-dim hover:text-accent">
        ← All issues
      </Link>

      <Card className="mb-6 p-5">
        <IssueEditForm issue={issue} people={people} projects={projects} />
      </Card>

      <section>
        <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
          Comments {issue.comments.length > 0 && `(${issue.comments.length})`}
        </h2>
        <div className="mb-4 flex flex-col gap-3">
          {issue.comments.map((c) => (
            <Card key={c.id} className="p-3">
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-[0.8rem] font-bold">{c.author}</span>
                <span className="font-mono text-[0.65rem] text-text-faint">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[0.83rem] text-text-dim">{c.body}</p>
            </Card>
          ))}
        </div>
        <CommentForm issueId={issue.id} />
      </section>
    </div>
  );
}
