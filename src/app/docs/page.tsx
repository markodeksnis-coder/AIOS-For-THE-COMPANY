import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocsSearch } from "@/components/docs-search";
import { DEPARTMENT_LABELS } from "@/lib/brain";

export default async function DocsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const { department } = await searchParams;

  if (department) {
    const files = await db.brainFile.findMany({
      where: { type: "doc", department },
      orderBy: { title: "asc" },
    });

    return (
      <div className="max-w-3xl">
        <div className="mb-5">
          <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
            Docs
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            {DEPARTMENT_LABELS[department] ?? department} · {files.length}{" "}
            {files.length === 1 ? "page" : "pages"}
          </h1>
        </div>
        <Card className="overflow-hidden">
          {files.length === 0 ? (
            <p className="px-4 py-6 text-center text-[0.83rem] text-text-faint">No docs yet.</p>
          ) : (
            files.map((f) => (
              <Link
                key={f.slug}
                href={`/docs/${f.slug}`}
                className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] transition-colors last:border-b-0 hover:bg-surface-hover"
              >
                <span className="flex-1 truncate font-bold">{f.title}</span>
                <Badge variant={f.status === "active" ? "good" : "default"}>{f.status}</Badge>
              </Link>
            ))
          )}
        </Card>
      </div>
    );
  }

  const files = await db.brainFile.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="max-w-3xl">
      <div className="mb-5">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Company · Docs
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">All docs</h1>
        <p className="mt-1 text-[0.88rem] text-text-dim">
          Every file in <code className="font-mono">/brain</code>, {files.length} total. Keyword
          search across title, excerpt, and department.
        </p>
      </div>
      <DocsSearch
        files={files.map((f) => ({
          slug: f.slug,
          title: f.title,
          type: f.type,
          department: f.department,
          status: f.status,
          excerpt: f.excerpt,
        }))}
      />
    </div>
  );
}
