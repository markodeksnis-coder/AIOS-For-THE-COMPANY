"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/field";

type SweepResult =
  | { leadId: string; leadName: string; kind: string; ok: true; draftsCreated: number; reply: string }
  | { leadId: string; leadName: string; kind: string; ok: false; error: string };

type SweepResponse = {
  swept: number;
  totalDraftsCreated: number;
  failed?: number;
  results: SweepResult[];
  message?: string;
  error?: string;
};

const KIND_LABEL: Record<string, string> = {
  closed_lost_followup: "closed-lost",
  no_show_followup: "no-show",
};

/** One click sweeps every closed-lost/no-show lead that has never had a
 *  follow-up drafted, and has the Sales agent write what's missing for all
 *  of them — the manual version is opening each lead one at a time and
 *  asking for a draft; this closes the whole backlog in one shot. */
export function FollowUpSweepButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SweepResponse | null>(null);
  const router = useRouter();

  function run() {
    startTransition(async () => {
      setResult(null);
      try {
        const res = await fetch("/api/sales/follow-up-sweep", { method: "POST" });
        const data = (await res.json()) as SweepResponse;
        if (!res.ok) {
          setResult({ swept: 0, totalDraftsCreated: 0, results: [], error: data.error ?? "Sweep failed." });
          return;
        }
        setResult(data);
        router.refresh();
      } catch (err) {
        setResult({
          swept: 0,
          totalDraftsCreated: 0,
          results: [],
          error: err instanceof Error ? err.message : "Sweep failed.",
        });
      }
    });
  }

  return (
    <div className="mb-6">
      <Button type="button" variant="ghost" onClick={run} disabled={pending} className="flex items-center gap-1.5">
        <Sparkles size={14} />
        {pending ? "Sweeping the pipeline…" : "Run AI follow-up sweep"}
      </Button>
      <p className="mt-1.5 max-w-[60ch] text-[0.74rem] text-text-faint">
        Scans every closed-lost/no-show lead with no follow-up drafted yet and has the Sales agent write what&rsquo;s
        missing, grounded in the real SOP sequences — nothing sends, everything lands in the queue below for review.
      </p>

      {result && (
        <Card className="relative mt-3 overflow-hidden p-4">
          <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: "var(--graph-people)" }} aria-hidden />
          {result.error ? (
            <p className="flex items-center gap-1.5 text-[0.82rem] text-critical">
              <XCircle size={14} />
              {result.error}
            </p>
          ) : result.swept === 0 ? (
            <p className="flex items-center gap-1.5 text-[0.82rem] text-good">
              <CheckCircle2 size={14} />
              {result.message ?? "Nothing to sweep — every lead is already covered."}
            </p>
          ) : (
            <div>
              <p className="mb-2 text-[0.82rem] font-semibold">
                Swept {result.swept} lead{result.swept > 1 ? "s" : ""} · wrote {result.totalDraftsCreated} new draft
                {result.totalDraftsCreated === 1 ? "" : "s"}
                {result.failed ? ` · ${result.failed} failed` : ""}
              </p>
              <div className="flex flex-col gap-1.5">
                {result.results.map((r) => (
                  <div key={r.leadId} className="flex items-center gap-2 text-[0.78rem]">
                    {r.ok ? (
                      <CheckCircle2 size={13} className="shrink-0 text-good" />
                    ) : (
                      <XCircle size={13} className="shrink-0 text-critical" />
                    )}
                    <span className="font-semibold">{r.leadName}</span>
                    <span className="text-text-faint">({KIND_LABEL[r.kind] ?? r.kind})</span>
                    <span className="ml-auto text-text-dim">
                      {r.ok ? `${r.draftsCreated} draft(s)` : r.error}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
