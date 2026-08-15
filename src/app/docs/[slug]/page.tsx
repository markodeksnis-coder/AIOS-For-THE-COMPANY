import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MarkdownBody } from "@/components/markdown-body";
import {
  DEPARTMENT_LABELS,
  TYPE_LABELS,
  getBacklinks,
  parseTags,
  parseYamlBody,
  resolveWikilinks,
} from "@/lib/brain";

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const file = await db.brainFile.findUnique({ where: { slug } });
  if (!file) notFound();
  // Departments have a purpose-built page (KPIs, team, apps rendered nicely) —
  // the generic doc view here would just be a worse, raw-JSON duplicate of it.
  if (file.type === "department" && file.department) {
    redirect(`/departments/${file.department}`);
  }

  const [backlinks, allFiles] = await Promise.all([
    getBacklinks(slug),
    db.brainFile.findMany({ select: { slug: true, title: true } }),
  ]);
  const slugToTitle = new Map(allFiles.map((f) => [f.slug, f.title]));

  const yamlData = parseYamlBody(file);
  const tags = parseTags(file);
  const isSample = file.title.toUpperCase().includes("SAMPLE");

  return (
    <div className="max-w-3xl">
      <Link href="/docs" className="mb-4 inline-block text-[0.8rem] text-text-dim hover:text-accent">
        ← All docs
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge variant="accent">{TYPE_LABELS[file.type] ?? file.type}</Badge>
        {file.department && (
          <Badge>{DEPARTMENT_LABELS[file.department] ?? file.department}</Badge>
        )}
        <Badge variant={file.status === "active" ? "good" : "default"}>{file.status}</Badge>
        {isSample && <Badge variant="sample">sample</Badge>}
      </div>

      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">{file.title}</h1>
      <p className="mb-6 font-mono text-[0.72rem] text-text-faint">
        {file.path} · updated {file.updated} · owner {file.owner ?? "—"}
      </p>

      {yamlData ? (
        <Card className="mb-6 overflow-x-auto p-4">
          <pre className="font-mono text-[0.78rem] leading-relaxed text-text-dim">
            {JSON.stringify(yamlData, null, 2)}
          </pre>
        </Card>
      ) : (
        <MarkdownBody content={resolveWikilinks(file.body, slugToTitle)} />
      )}

      {tags.length > 0 && (
        <div className="mb-8 mt-6 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t}>#{t}</Badge>
          ))}
        </div>
      )}

      {backlinks.length > 0 && (
        <div className="mt-8 border-t border-border pt-5">
          <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
            Linked from {backlinks.length} file{backlinks.length === 1 ? "" : "s"}
          </h2>
          <div className="flex flex-col gap-1">
            {backlinks.map((b) => (
              <Link
                key={b.slug}
                href={`/docs/${b.slug}`}
                className="rounded-md px-2 py-1 text-[0.83rem] font-semibold text-accent hover:bg-surface-hover"
              >
                {b.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
