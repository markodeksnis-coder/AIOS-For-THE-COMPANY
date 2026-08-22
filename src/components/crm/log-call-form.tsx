"use client";

import { useState } from "react";
import { logSalesCall } from "@/lib/actions/leads";
import { Card } from "@/components/ui/card";
import { Button, Label, Select, TextArea, TextInput } from "@/components/ui/field";
import { LOGGABLE_CALL_OUTCOMES, CALL_OUTCOME_LABELS, OUTCOME_LOSS_REASON, type CallOutcome } from "@/lib/crm";

const LOST_OUTCOMES = new Set<CallOutcome>(["no_money", "not_a_fit"]);

type PendingCall = { scheduledAt: string; recordingLink: string | null; notes: string | null };

export function LogCallForm({ leadId, pendingCall }: { leadId: string; pendingCall?: PendingCall | null }) {
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome>("pif");
  const isLost = LOST_OUTCOMES.has(outcome);

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[0.8rem] font-bold">Log a call</h2>
      {pendingCall && (
        <p className="mb-3 rounded-lg border border-accent/30 bg-accent-wash px-3 py-2 text-[0.76rem] text-accent-strong">
          Fathom recording ready — the link and notes below are pre-filled from it. Pick what actually happened
          and submit to finish logging this call.
        </p>
      )}
      <form
        action={async (formData) => {
          setPending(true);
          await logSalesCall(leadId, formData);
          setPending(false);
        }}
        className="flex flex-col gap-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <TextInput
              name="scheduledAt"
              type="date"
              required
              defaultValue={pendingCall?.scheduledAt ?? new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <Label>Outcome</Label>
            <Select name="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as CallOutcome)}>
              {LOGGABLE_CALL_OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {CALL_OUTCOME_LABELS[o]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Rep</Label>
            <TextInput name="rep" placeholder="Who took the call" />
          </div>
          <div>
            <Label>Cash collected</Label>
            <TextInput name="cashCollected" type="number" min="0" step="0.01" placeholder="0" />
          </div>
          {outcome === "plan" && (
            <div>
              <Label>Plan length</Label>
              <TextInput name="planLength" placeholder="6 months…" />
            </div>
          )}
          {isLost && (
            <div>
              <Label>Loss reason</Label>
              <TextInput name="lossReason" defaultValue={OUTCOME_LOSS_REASON[outcome] ?? ""} />
            </div>
          )}
        </div>
        <div>
          <Label>Recording link</Label>
          <TextInput name="recordingLink" placeholder="https://…" defaultValue={pendingCall?.recordingLink ?? ""} />
        </div>
        <div>
          <Label>Notes</Label>
          <TextArea
            name="notes"
            rows={2}
            placeholder="What happened on the call…"
            defaultValue={pendingCall?.notes ?? ""}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Logging…" : "Log call"}
        </Button>
      </form>
    </Card>
  );
}
