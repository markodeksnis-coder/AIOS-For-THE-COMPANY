import Link from "next/link";
import { db } from "@/lib/db";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from "@/lib/brain";
import { DocsSidebarLink } from "@/components/docs-sidebar-link";

export async function DocsSidebar() {
  const docs = await db.brainFile.findMany({
    where: { type: "doc" },
    orderBy: { title: "asc" },
    select: { slug: true, title: true, department: true },
  });

  const grouped = new Map<string, typeof docs>();
  for (const d of docs) {
    const key = d.department ?? "other";
    grouped.set(key, [...(grouped.get(key) ?? []), d]);
  }
  const orderedKeys = [...grouped.keys()].sort(
    (a, b) => DEPARTMENT_ORDER.indexOf(a) - DEPARTMENT_ORDER.indexOf(b)
  );

  return (
    <nav className="sticky top-6 flex h-[calc(100vh-3rem)] w-[210px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-border pr-4">
      <Link
        href="/docs"
        className="font-mono text-[0.68rem] uppercase tracking-widest text-text-faint hover:text-accent"
      >
        All docs · {docs.length}
      </Link>
      {orderedKeys.map((dept) => (
        <div key={dept}>
          <div className="mb-1 px-2 font-mono text-[0.62rem] uppercase tracking-widest text-text-faint">
            {DEPARTMENT_LABELS[dept] ?? dept}
          </div>
          <div className="flex flex-col gap-0.5">
            {grouped.get(dept)!.map((d) => (
              <DocsSidebarLink key={d.slug} slug={d.slug} title={d.title} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
