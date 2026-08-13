import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEPARTMENT_LABELS, parseYamlBody, stripWikilink } from "@/lib/brain";
import { WikiText } from "@/components/wiki-text";

type DeptData = {
  mission?: string;
  kpis?: { name: string; target: string; status?: string }[];
  team?: string[];
  apps?: string[];
  head_agent?: string | null;
};

export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ dept: string }>;
}) {
  const { dept } = await params;
  const file = await db.brainFile.findFirst({ where: { type: "department", department: dept } });
  if (!file) notFound();

  const data = (parseYamlBody(file) ?? {}) as DeptData;
  const teamSlugs = (data.team ?? []).map(stripWikilink);
  const appSlugs = (data.apps ?? []).map(stripWikilink);
  const headAgentSlug = data.head_agent ? stripWikilink(data.head_agent) : null;

  const [teamRows, appRows, agentRows, allFiles] = await Promise.all([
    teamSlugs.length ? db.brainFile.findMany({ where: { slug: { in: teamSlugs } } }) : [],
    appSlugs.length ? db.brainFile.findMany({ where: { slug: { in: appSlugs } } }) : [],
    db.brainFile.findMany({ where: { type: "agent", department: dept } }),
    db.brainFile.findMany({ select: { slug: true, title: true } }),
  ]);
  const slugToTitle = new Map(allFiles.map((f) => [f.slug, f.title]));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Department
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          {DEPARTMENT_LABELS[dept] ?? dept}
        </h1>
        {data.mission && (
          <p className="mt-2 max-w-[60ch] text-[0.9rem] text-text-dim">
            <WikiText text={data.mission} slugToTitle={slugToTitle} />
          </p>
        )}
      </div>

      <section className="mb-6">
        <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
          KPIs
        </h2>
        {data.kpis && data.kpis.length > 0 ? (
          <Card className="overflow-hidden">
            {data.kpis.map((k, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] last:border-b-0"
              >
                <span className="flex-1 font-bold">{k.name}</span>
                <span className="text-text-faint">{k.target}</span>
                <Badge variant={k.status === "draft" ? "sample" : "default"}>
                  {k.status ?? "draft"}
                </Badge>
              </div>
            ))}
          </Card>
        ) : (
          <p className="text-[0.8rem] text-text-faint">No KPIs set yet.</p>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
          Team{headAgentSlug ? " & lead agent" : ""}
        </h2>
        <div className="flex flex-wrap gap-2">
          {teamRows.map((p) => (
            <Link
              key={p.slug}
              href={`/docs/${p.slug}`}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[0.82rem] font-semibold transition-colors hover:border-accent"
            >
              {p.title}
            </Link>
          ))}
          {agentRows.map((a) => (
            <Link
              key={a.slug}
              href={`/docs/${a.slug}`}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[0.82rem] font-semibold transition-colors hover:border-accent"
            >
              {a.title}
              <Badge variant="sample">agent</Badge>
            </Link>
          ))}
          {teamRows.length === 0 && agentRows.length === 0 && (
            <p className="text-[0.8rem] text-text-faint">No one assigned yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
          Apps
        </h2>
        {appRows.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {appRows.map((a) => (
              <Link
                key={a.slug}
                href={`/docs/${a.slug}`}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[0.82rem] font-semibold transition-colors hover:border-accent"
              >
                {a.title}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[0.8rem] text-text-faint">None yet.</p>
        )}
      </section>
    </div>
  );
}
