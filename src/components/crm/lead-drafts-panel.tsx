"use client";

import { useState } from "react";
import { Copy, Check, Mail, MessageSquare, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/field";

export type DraftRow = {
  id: string;
  kind: string;
  channel: string;
  content: string;
  createdAt: string;
};

const CHANNEL_ICON = { email: Mail, sms: MessageSquare, loom_script: Video } as const;
const CHANNEL_LABEL = { email: "Email", sms: "Text message", loom_script: "Loom script" } as const;

export function LeadDraftsPanel({
  leadId,
  stage,
  initialDrafts,
}: {
  leadId: string;
  stage: string;
  initialDrafts: DraftRow[];
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(kind: "no_show_followup" | "closed_lost_followup") {
    setPending(kind);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Draft failed.");
      setDrafts((prev) => [...(data.drafts ?? []), ...prev.filter((d) => d.kind !== kind)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card className="relative overflow-hidden p-4">
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: "var(--graph-knowledge)" }} aria-hidden />
      <h2 className="mb-3 text-[0.8rem] font-bold">Follow-up drafts</h2>
      <p className="mb-3 text-[0.76rem] text-text-dim">
        Head of Sales writes these — nothing sends automatically, you copy and send yourself.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {stage === "no_show" && (
          <Button onClick={() => generate("no_show_followup")} disabled={pending !== null} className="text-[0.78rem]">
            {pending === "no_show_followup" ? "Drafting…" : "Draft no-show follow-up"}
          </Button>
        )}
        {stage === "closed_lost" && (
          <Button
            onClick={() => generate("closed_lost_followup")}
            disabled={pending !== null}
            className="text-[0.78rem]"
          >
            {pending === "closed_lost_followup" ? "Drafting…" : "Draft closed-lost follow-up"}
          </Button>
        )}
        {stage !== "no_show" && stage !== "closed_lost" && (
          <p className="text-[0.76rem] text-text-faint">
            Follow-up drafting is available once this lead is marked No-Show or Closed Lost.
          </p>
        )}
      </div>

      {error && <p className="mb-2 text-[0.78rem] text-critical">{error}</p>}

      {drafts.length === 0 ? (
        <p className="text-[0.8rem] text-text-faint">No drafts yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {drafts.map((d) => (
            <DraftCard key={d.id} draft={d} />
          ))}
        </div>
      )}
    </Card>
  );
}

function DraftCard({ draft }: { draft: DraftRow }) {
  const [copied, setCopied] = useState(false);
  const Icon = CHANNEL_ICON[draft.channel as keyof typeof CHANNEL_ICON] ?? Mail;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={13} className="text-text-faint" />
        <span className="text-[0.72rem] font-bold uppercase tracking-wide text-text-faint">
          {CHANNEL_LABEL[draft.channel as keyof typeof CHANNEL_LABEL] ?? draft.channel}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(draft.content).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="ml-auto flex items-center gap-1 text-[0.72rem] font-semibold text-accent-strong hover:underline"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-[0.8rem] text-foreground">{draft.content}</p>
    </div>
  );
}
