import Link from "next/link";
import { Sparkles, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEPARTMENT_LABELS } from "@/lib/brain";
import { DEPARTMENT_GRADIENTS } from "@/lib/department-style";

export const dynamic = "force-dynamic";

type StoredAction = { tool: string; summary: string };

const KIND_LABEL: Record<string, string> = {
  daily_digest: "Daily check-in",
  follow_up_sweep: "AI follow-up sweep",
};

function formatWhen(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ActivityPage() {
  const runs = await db.agentActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Agents · Activity
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Activity feed</h1>
        <p className="mt-1 max-w-[60ch] text-[0.88rem] text-text-dim">
          Everything your agents did on their own, without anyone chatting with them — daily
          check-ins and whatever real actions came out of them. Newest first.
        </p>
      </div>

      {runs.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <Sparkles size={22} className="text-text-faint" />
          <p className="text-[0.85rem] font-bold">No autonomous runs yet</p>
          <p className="max-w-[42ch] text-[0.8rem] text-text-faint">
            Agents check in once a day on their own schedule. Once the daily run fires for the
            first time, what each one found and did will show up here.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {runs.map((run) => {
            const actions = JSON.parse(run.actions) as StoredAction[];
            const gradient = run.department ? DEPARTMENT_GRADIENTS[run.department] : undefined;
            const deptLabel = run.department ? DEPARTMENT_LABELS[run.department] ?? run.department : null;

            return (
              <Card key={run.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[0.7rem] font-bold text-white"
                    style={{ backgroundImage: gradient ?? "linear-gradient(135deg, #6366F1, #14B8A6)" }}
                  >
                    {run.agentTitle.slice(0, 1)}
                  </span>
                  <Link
                    href={`/agents/${run.agentSlug}/chat`}
                    className="text-[0.85rem] font-bold hover:underline"
                  >
                    {run.agentTitle}
                  </Link>
                  {deptLabel && (
                    <span className="font-mono text-[0.68rem] text-text-faint">{deptLabel}</span>
                  )}
                  <Badge variant="accent">{KIND_LABEL[run.kind] ?? run.kind}</Badge>
                  <span className="ml-auto shrink-0 font-mono text-[0.68rem] text-text-faint">
                    {formatWhen(run.createdAt)}
                  </span>
                </div>

                <p className="whitespace-pre-wrap text-[0.85rem] leading-relaxed text-text-dim">
                  {run.summary}
                </p>

                {actions.length > 0 && (
                  <div className="flex flex-col gap-1 border-t border-border pt-2.5">
                    {actions.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 font-mono text-[0.72rem] text-good"
                      >
                        <Wrench size={11} />
                        {a.summary}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
