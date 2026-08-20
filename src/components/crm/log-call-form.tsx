"use client";

import { useState } from "react";
import { logSalesCall } from "@/lib/actions/leads";
import { Card } from "@/components/ui/card";
import { Button, Label, Select, TextArea, TextInput } from "@/components/ui/field";
import { CALL_OUTCOMES, CALL_OUTCOME_LABELS } from "@/lib/crm";

export function LogCallForm({ leadId }: { leadId: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[0.8rem] font-bold">Log a call</h2>
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
            <TextInput name="scheduledAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <Label>Outcome</Label>
            <Select name="outcome" defaultValue="closed">
              {CALL_OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {CALL_OUTCOME_LABELS[o]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Cash collected (optional)</Label>
          <TextInput name="cashCollected" type="number" min="0" step="0.01" placeholder="0" />
        </div>
        <div>
          <Label>Notes</Label>
          <TextArea name="notes" rows={2} placeholder="What happened on the call…" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Logging…" : "Log call"}
        </Button>
      </form>
    </Card>
  );
}
