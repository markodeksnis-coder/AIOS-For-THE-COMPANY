import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from "@/lib/brain";

export default async function SystemsPage() {
  const systems = await db.brainFile.findMany({ where: { type: "system" } });
  const grouped = new Map<string, typeof systems>();
  for (const s of systems) {
    const key = s.department ?? "unassigned";
    grouped.set(key, [...(grouped.get(key) ?? []), s]);
  }
  const orderedKeys = [...grouped.keys()].sort(
    (a, b) => DEPARTMENT_ORDER.indexOf(a) - DEPARTMENT_ORDER.indexOf(b)
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Company · Systems
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Systems</h1>
        <p className="mt-1 max-w-[60ch] text-[0.88rem] text-text-dim">
          The repeatable processes each department runs — how a lead becomes an appointment, how
          a client gets onboarded. Real ones live in <code className="text-text-faint">/brain</code>{" "}
          as system files.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {orderedKeys.map((dept) => (
          <section key={dept}>
            <h2 className="mb-2 text-[0.85rem] font-extrabold">
              {DEPARTMENT_LABELS[dept] ?? dept}{" "}
              <span className="font-mono text-[0.68rem] font-normal text-text-faint">
                {grouped.get(dept)!.length}
              </span>
            </h2>
            <Card className="overflow-hidden">
              {grouped.get(dept)!.map((s) => (
                <Link
                  key={s.slug}
                  href={`/docs/${s.slug}`}
                  className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] transition-colors last:border-b-0 hover:bg-surface-hover"
                >
                  <span className="font-bold">{s.title}</span>
                  <span className="flex-1 truncate text-text-faint">{s.excerpt}</span>
                  {s.status === "draft" && <Badge variant="sample">draft</Badge>}
                </Link>
              ))}
            </Card>
          </section>
        ))}
      </div>

      {systems.length === 0 && (
        <p className="text-[0.83rem] text-text-faint">No systems documented yet.</p>
      )}
    </div>
  );
}
