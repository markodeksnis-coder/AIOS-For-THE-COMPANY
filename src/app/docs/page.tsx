import Link from "next/link";
import { Folder } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocsSearch } from "@/components/docs-search";
import { DEPARTMENT_LABELS, parseTags } from "@/lib/brain";

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

    // Knowledge-source roots (e.g. "Imperium Acquisition") get a folder
    // card so a whole curriculum reads as one place to browse into,
    // instead of every module and lesson dumped in one flat list —
    // everything under that root's own /knowledge/<slug>/ tree is excluded
    // from the flat list below, not just the root file itself.
    const sources = files.filter((f) => parseTags(f).includes("knowledge-source"));
    const sourceDirs = sources.map((f) => f.path.slice(0, f.path.lastIndexOf("/") + 1));
    const rest = files.filter((f) => !sourceDirs.some((dir) => f.path.startsWith(dir)));

    return (
      <div className="max-w-3xl">
        <div className="mb-5">
          <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
            Knowledge
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            {DEPARTMENT_LABELS[department] ?? department} · {files.length}{" "}
            {files.length === 1 ? "page" : "pages"}
          </h1>
        </div>

        {sources.length > 0 && (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sources.map((f) => (
              <Link key={f.slug} href={`/docs/${f.slug}`}>
                <Card className="flex h-full items-center gap-3 p-4 transition-colors hover:border-accent">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-wash text-accent-strong">
                    <Folder size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[0.9rem] font-bold">{f.title}</div>
                    <div className="text-[0.76rem] text-text-faint">
                      {f.status === "active" ? "Knowledge source" : "Placeholder — awaiting content"}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {rest.length > 0 && (
          <Card className="overflow-hidden">
            {rest.map((f) => (
              <Link
                key={f.slug}
                href={`/docs/${f.slug}`}
                className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] transition-colors last:border-b-0 hover:bg-surface-hover"
              >
                <span className="flex-1 truncate font-bold">{f.title}</span>
                <Badge variant={f.status === "active" ? "good" : "default"}>{f.status}</Badge>
              </Link>
            ))}
          </Card>
        )}

        {files.length === 0 && (
          <p className="px-4 py-6 text-center text-[0.83rem] text-text-faint">No docs yet.</p>
        )}
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
