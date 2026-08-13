import { db } from "@/lib/db";
import { DocsSearch } from "@/components/docs-search";

export default async function DocsIndexPage() {
  const files = await db.brainFile.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="mx-auto max-w-3xl">
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
