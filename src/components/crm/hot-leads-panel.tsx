"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/field";

export type PredictionRow = {
  rank: number;
  reasoning: string;
  lead: { id: string; name: string; stage: string; cashCollected: number };
};

export function HotLeadsPanel({
  predictions,
  refreshedAt,
}: {
  predictions: PredictionRow[];
  refreshedAt: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/predictions/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mb-6 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Flame size={16} className="text-critical" />
        <h2 className="text-[0.85rem] font-bold">Top 5 hottest open deals</h2>
        <span className="text-[0.72rem] text-text-faint">
          {refreshedAt ? `updated ${new Date(refreshedAt).toLocaleString()}` : "never refreshed"}
        </span>
        <Button onClick={refresh} disabled={pending} className="ml-auto px-3 py-1.5 text-[0.72rem]">
          {pending ? "Thinking…" : "Refresh predictions"}
        </Button>
      </div>

      {error && <p className="mb-2 text-[0.78rem] text-critical">{error}</p>}

      {predictions.length === 0 ? (
        <p className="text-[0.8rem] text-text-faint">
          No predictions yet — click &ldquo;Refresh predictions&rdquo; to have Head of Sales rank your open
          pipeline.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {predictions.map((p) => (
            <Link
              key={p.rank}
              href={`/sales/crm/${p.lead.id}`}
              className="flex items-start gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:border-accent hover:bg-surface-hover"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-wash font-mono text-[0.68rem] font-bold text-accent-strong">
                {p.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[0.83rem] font-bold">{p.lead.name}</div>
                <p className="text-[0.76rem] text-text-dim">{p.reasoning}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
