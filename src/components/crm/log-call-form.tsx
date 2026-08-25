"use client";

import { useState } from "react";
import { logSalesCall } from "@/lib/actions/leads";
import { Card } from "@/components/ui/card";
import { Button, Label, Select, TextArea, TextInput } from "@/components/ui/field";
import {
  CALL_STATUSES,
  CALL_STATUS_LABELS,
  CALL_RESULTS,
  CALL_RESULT_LABELS,
  RESULT_LOSS_REASON,
  toBerlinDatetimeLocal,
  type CallStatus,
  type CallResult,
} from "@/lib/crm";

const LOST_RESULTS = new Set<CallResult>(["closed_lost", "not_qualified"]);

type PendingCall = { scheduledAt: string; recordingLink: string | null; notes: string | null; aiSummary: string | null };

export function LogCallForm({ leadId, pendingCall }: { leadId: string; pendingCall?: PendingCall | null }) {
  const [pending, setPending] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>("showed");
  const [result, setResult] = useState<CallResult | "">("");
  const isLost = result !== "" && LOST_RESULTS.has(result);
  const showsResult = callStatus === "showed";

  return (
    <Card id="log-call" className="scroll-mt-6 p-4">
      <h2 className="mb-3 text-[0.8rem] font-bold">Log a call</h2>
      {pendingCall && (
        <div className="mb-3 rounded-lg border border-accent/30 bg-accent-wash px-3 py-2 text-[0.76rem] text-accent-strong">
          <p>Fathom recording ready — the link below is pre-filled from it. Pick what actually happened and submit to finish logging this call.</p>
          {pendingCall.aiSummary && (
            <p className="mt-1.5 italic text-accent-strong/90">
              <span className="font-semibold not-italic">Fathom summary: </span>
              {pendingCall.aiSummary}
            </p>
          )}
        </div>
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
            <Label>Date / time</Label>
            <TextInput
              name="scheduledAt"
              type="datetime-local"
              required
              defaultValue={pendingCall?.scheduledAt ?? toBerlinDatetimeLocal(new Date())}
            />
          </div>
          <div>
            <Label>Call status</Label>
            <Select
              name="callStatus"
              value={callStatus}
              onChange={(e) => {
                setCallStatus(e.target.value as CallStatus);
                setResult("");
              }}
            >
              {CALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CALL_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          {showsResult && (
            <div>
              <Label>Result</Label>
              <Select name="result" value={result} onChange={(e) => setResult(e.target.value as CallResult | "")}>
                <option value="">— not yet —</option>
                {CALL_RESULTS.map((r) => (
                  <option key={r} value={r}>
                    {CALL_RESULT_LABELS[r]}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <Label>Rep</Label>
            <TextInput name="rep" placeholder="Who took the call" />
          </div>
          <div>
            <Label>Cash collected</Label>
            <TextInput name="cashCollected" type="number" min="0" step="0.01" placeholder="0" />
          </div>
          {result === "closed_won" && (
            <div>
              <Label>Plan length</Label>
              <TextInput name="planLength" placeholder="6 months…" />
            </div>
          )}
          {isLost && (
            <div>
              <Label>Loss reason</Label>
              <TextInput name="lossReason" defaultValue={result ? (RESULT_LOSS_REASON[result] ?? "") : ""} />
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
