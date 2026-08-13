import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER, parseYamlBody } from "@/lib/brain";
import { WikiText } from "@/components/wiki-text";

export default async function TeamsPage() {
  const [departments, people, allFiles] = await Promise.all([
    db.brainFile.findMany({ where: { type: "department" } }),
    db.brainFile.findMany({ where: { type: "person" } }),
    db.brainFile.findMany({ select: { slug: true, title: true } }),
  ]);
  const slugToTitle = new Map(allFiles.map((f) => [f.slug, f.title]));

  const sortedDepartments = [...departments].sort(
    (a, b) =>
      DEPARTMENT_ORDER.indexOf(a.department ?? "") - DEPARTMENT_ORDER.indexOf(b.department ?? "")
  );
  const leadership = people.filter((p) => !p.department);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Company · Teams &amp; Members
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          {DEPARTMENT_ORDER.length} teams, {people.length} people
        </h1>
      </div>

      {leadership.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
            Leadership — spans every department
          </h2>
          <PeopleList people={leadership} />
        </section>
      )}

      <div className="flex flex-col gap-5">
        {sortedDepartments.map((d) => {
          const members = people.filter((p) => p.department === d.department);
          const data = parseYamlBody(d) as { mission?: string } | null;
          return (
            <section key={d.slug}>
              <div className="mb-2 flex items-baseline justify-between">
                <Link
                  href={`/departments/${d.department}`}
                  className="text-[0.95rem] font-extrabold hover:text-accent"
                >
                  {DEPARTMENT_LABELS[d.department ?? ""] ?? d.department}
                </Link>
                <span className="font-mono text-[0.72rem] text-text-faint">
                  {members.length} member{members.length === 1 ? "" : "s"}
                </span>
              </div>
              {data?.mission && (
                <p className="mb-2 max-w-[64ch] text-[0.8rem] text-text-dim">
                  <WikiText text={data.mission} slugToTitle={slugToTitle} />
                </p>
              )}
              {members.length > 0 ? (
                <PeopleList people={members} />
              ) : (
                <p className="text-[0.78rem] text-text-faint">No one assigned yet.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PeopleList({
  people,
}: {
  people: { slug: string; title: string; excerpt: string }[];
}) {
  return (
    <Card className="overflow-hidden">
      {people.map((p) => (
        <Link
          key={p.slug}
          href={`/docs/${p.slug}`}
          className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] transition-colors last:border-b-0 hover:bg-surface-hover"
        >
          <span className="font-bold">{p.title}</span>
          <span className="flex-1 truncate text-text-faint">{p.excerpt}</span>
          {p.slug.startsWith("sample-") && <Badge variant="sample">sample</Badge>}
        </Link>
      ))}
    </Card>
  );
}
