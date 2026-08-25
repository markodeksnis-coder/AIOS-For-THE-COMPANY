"use client";

import { useState } from "react";
import { assignUnmatchedCall, dismissUnmatchedCall } from "@/lib/actions/webhooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/field";
import { LeadPicker } from "@/components/crm/lead-picker";

export type UnmatchedCallRow = {
  id: string;
  source: string;
  attendeeEmail: string | null;
  attendeeName: string | null;
  attendeePhone: string | null;
  scheduledAt: string | null;
  aiSummary: string | null;
  recordingLink: string | null;
  createdAtLabel: string;
};

export function UnmatchedCallsTable({ calls, leads }: { calls: UnmatchedCallRow[]; leads: { id: string; name: string }[] }) {
  const [rows, setRows] = useState(calls);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function assign(callId: string, leadId: string) {
    setAssigningId(null);
    setPendingId(callId);
    try {
      await assignUnmatchedCall(callId, leadId);
      setRows((prev) => prev.filter((r) => r.id !== callId));
    } finally {
      setPendingId(null);
    }
  }

  async function dismiss(callId: string) {
    setPendingId(callId);
    try {
      await dismissUnmatchedCall(callId);
      setRows((prev) => prev.filter((r) => r.id !== callId));
    } finally {
      setPendingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <Card className="p-6 text-center text-[0.83rem] text-text-faint">
        Nothing unmatched right now — every recording has landed on a lead.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((c) => (
        <Card key={c.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.85rem] font-bold">{c.attendeeName ?? c.attendeeEmail ?? "Unknown attendee"}</span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.62rem] font-bold uppercase text-text-faint">
                  {c.source}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[0.72rem] text-text-faint">
                {c.attendeeEmail && <span>{c.attendeeEmail}</span>}
                {c.attendeePhone && <span>{c.attendeePhone}</span>}
                {c.scheduledAt && <span>{c.scheduledAt}</span>}
                <span>received {c.createdAtLabel}</span>
              </div>
              {c.aiSummary && <p className="mt-2 max-w-[60ch] text-[0.8rem] text-text-dim">{c.aiSummary}</p>}
              {c.recordingLink && (
                <a
                  href={c.recordingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-[0.76rem] font-semibold text-accent-strong hover:underline"
                >
                  recording ↗
                </a>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {assigningId === c.id ? (
                <LeadPicker
                  leads={leads}
                  onSelect={(l) => assign(c.id, l.id)}
                  placeholder="Assign to…"
                  autoFocus
                  onEscape={() => setAssigningId(null)}
                  className="w-56"
                />
              ) : (
                <Button variant="primary" onClick={() => setAssigningId(c.id)} disabled={pendingId === c.id}>
                  Assign to lead
                </Button>
              )}
              <Button variant="ghost" onClick={() => dismiss(c.id)} disabled={pendingId === c.id}>
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
