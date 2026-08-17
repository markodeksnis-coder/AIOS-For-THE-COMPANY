import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from "@/lib/brain";

export default async function AgentsPage() {
  const agents = await db.brainFile.findMany({ where: { type: "agent" } });
  const liveCount = agents.filter((a) => a.status === "active").length;
  const grouped = new Map<string, typeof agents>();
  for (const a of agents) {
    const key = a.department ?? "unassigned";
    grouped.set(key, [...(grouped.get(key) ?? []), a]);
  }
  const orderedKeys = [...grouped.keys()].sort(
    (a, b) => DEPARTMENT_ORDER.indexOf(a) - DEPARTMENT_ORDER.indexOf(b)
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          The Brain · Agents
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Agents registry</h1>
        <p className="mt-1 max-w-[60ch] text-[0.88rem] text-text-dim">
          {agents.length} agent definitions exist as files.{" "}
          {liveCount > 0
            ? `${liveCount} have a real runtime — click through to chat.`
            : "None have a real runtime yet."}{" "}
          Status below is honest: an inactive agent says &ldquo;not running&rdquo;, not a fake
          &ldquo;idle&rdquo;.
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
              {grouped.get(dept)!.map((a) => {
                const isLive = a.status === "active";
                return (
                  <Link
                    key={a.slug}
                    href={isLive ? `/agents/${a.slug}/chat` : `/docs/${a.slug}`}
                    className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] transition-colors last:border-b-0 hover:bg-surface-hover"
                  >
                    <span className="font-bold">{a.title}</span>
                    <span className="flex-1 truncate text-text-faint">{a.excerpt}</span>
                    {isLive ? (
                      <span className="flex items-center gap-1 font-mono text-[0.68rem] font-bold text-good">
                        <MessageCircle size={12} />
                        open chat
                      </span>
                    ) : (
                      <span className="font-mono text-[0.68rem] text-text-faint">not running</span>
                    )}
                    <Badge variant={isLive ? "good" : "sample"}>{isLive ? "live" : "sample"}</Badge>
                  </Link>
                );
              })}
            </Card>
          </section>
        ))}
      </div>

      {agents.length === 0 && (
        <p className="text-[0.83rem] text-text-faint">No agent definitions yet.</p>
      )}
    </div>
  );
}
