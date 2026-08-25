"use client";

import { useState } from "react";
import { createFollowUpTouch } from "@/lib/actions/follow-ups";
import { Card } from "@/components/ui/card";
import { Button, Label, TextArea, TextInput } from "@/components/ui/field";
import { LeadPicker, type PickedLead } from "@/components/crm/lead-picker";
import { toBerlinDatetimeLocal } from "@/lib/crm";

export function NewFollowUpForm({ leads, templateNames }: { leads: PickedLead[]; templateNames: string[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [lead, setLead] = useState<PickedLead | null>(null);
  const [alreadySent, setAlreadySent] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="mb-4">
        + New follow-up
      </Button>
    );
  }

  return (
    <Card className="mb-4 p-4">
      <form
        action={async (formData) => {
          setPending(true);
          await createFollowUpTouch(formData);
          setPending(false);
          setOpen(false);
          setLead(null);
          setAlreadySent(false);
        }}
        className="flex flex-col gap-3"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2">
            <Label>Lead</Label>
            {lead ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
                <span className="flex-1 truncate text-[0.86rem] font-semibold">{lead.name}</span>
                <button type="button" onClick={() => setLead(null)} className="text-[0.72rem] font-semibold text-text-faint hover:text-foreground">
                  change
                </button>
              </div>
            ) : (
              <LeadPicker leads={leads} onSelect={setLead} placeholder="Which lead?" />
            )}
            <input type="hidden" name="leadId" value={lead?.id ?? ""} required />
          </div>
          <div className="col-span-2">
            <Label>Template / reason</Label>
            <TextInput name="templateName" placeholder="No-show follow-up…" list="template-names" required />
            <datalist id="template-names">
              {templateNames.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Due</Label>
            <TextInput name="dueAt" type="datetime-local" required defaultValue={toBerlinDatetimeLocal(new Date())} />
          </div>
          <div className="col-span-2">
            <Label>Loom link</Label>
            <TextInput name="loomUrl" placeholder="https://loom.com/share/…" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-[0.8rem] font-semibold">
          <input
            type="checkbox"
            name="alreadySent"
            checked={alreadySent}
            onChange={(e) => setAlreadySent(e.target.checked)}
            className="h-4 w-4 accent-accent-strong"
          />
          Already sent — log it directly instead of queuing it
        </label>
        {alreadySent && (
          <div className="max-w-xs">
            <Label>Sent at</Label>
            <TextInput name="sentAt" type="datetime-local" defaultValue={toBerlinDatetimeLocal(new Date())} />
          </div>
        )}

        <div>
          <Label>Notes</Label>
          <TextArea name="notes" rows={2} placeholder="Anything worth remembering about this one…" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={pending || !lead}>
            {pending ? "Saving…" : alreadySent ? "Log follow-up" : "Queue follow-up"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
