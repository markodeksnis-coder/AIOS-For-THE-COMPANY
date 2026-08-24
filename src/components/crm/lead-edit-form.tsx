"use client";

import { useState } from "react";
import { updateLead, deleteLead } from "@/lib/actions/leads";
import { Button, Label, TextArea, TextInput } from "@/components/ui/field";

export type EditableLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  timezone: string | null;
  source: string | null;
  funnel: string | null;
  notes: string | null;
  dealValue: number | null;
  location: string | null;
  instagramOrLinkedin: string | null;
  yearsRunningAgency: number | null;
  monthlyRevenue: number | null;
  nextCallAt: string | null; // ISO string, already trimmed to datetime-local format by the caller
};

export function LeadEditForm({ lead }: { lead: EditableLead }) {
  const [pending, setPending] = useState(false);
  const [hasFollowUp, setHasFollowUp] = useState(Boolean(lead.nextCallAt));

  return (
    <div className="flex flex-col gap-3">
      <form
        action={async (formData) => {
          setPending(true);
          await updateLead(lead.id, formData);
          setPending(false);
        }}
        className="flex flex-col gap-3"
      >
        <div>
          <Label>Name</Label>
          <TextInput name="name" defaultValue={lead.name} required />
        </div>
        <div>
          <Label>Email</Label>
          <TextInput name="email" type="email" defaultValue={lead.email ?? ""} />
        </div>
        <div>
          <Label>Phone</Label>
          <TextInput name="phone" defaultValue={lead.phone ?? ""} />
        </div>
        <div>
          <Label>Company</Label>
          <TextInput name="company" defaultValue={lead.company ?? ""} />
        </div>
        <div>
          <Label>Timezone</Label>
          <TextInput name="timezone" defaultValue={lead.timezone ?? ""} />
        </div>

        <div>
          <label className="flex items-center gap-2 text-[0.8rem] font-semibold">
            <input
              type="checkbox"
              checked={hasFollowUp}
              onChange={(e) => setHasFollowUp(e.target.checked)}
              className="h-4 w-4 accent-accent-strong"
            />
            Follow-up call booked?
          </label>
          {hasFollowUp && (
            <div className="mt-2">
              <Label>When</Label>
              <TextInput name="nextCallAt" type="datetime-local" defaultValue={lead.nextCallAt ?? ""} required />
            </div>
          )}
        </div>

        <div>
          <Label>Source</Label>
          <TextInput name="source" defaultValue={lead.source ?? ""} />
        </div>
        <div>
          <Label>Funnel / campaign</Label>
          <TextInput name="funnel" defaultValue={lead.funnel ?? ""} />
        </div>
        <div>
          <Label>Deal value</Label>
          <TextInput name="dealValue" type="number" min="0" step="0.01" defaultValue={lead.dealValue ?? ""} />
        </div>

        <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-widest text-text-faint">
          Qualification
        </p>
        <div>
          <Label>Location</Label>
          <TextInput name="location" defaultValue={lead.location ?? ""} />
        </div>
        <div>
          <Label>Instagram / LinkedIn</Label>
          <TextInput name="instagramOrLinkedin" defaultValue={lead.instagramOrLinkedin ?? ""} />
        </div>
        <div>
          <Label>Years running agency</Label>
          <TextInput
            name="yearsRunningAgency"
            type="number"
            min="0"
            step="0.5"
            defaultValue={lead.yearsRunningAgency ?? ""}
          />
        </div>
        <div>
          <Label>Monthly revenue</Label>
          <TextInput name="monthlyRevenue" type="number" min="0" step="0.01" defaultValue={lead.monthlyRevenue ?? ""} />
        </div>

        <div>
          <Label>Notes</Label>
          <TextArea name="notes" rows={3} defaultValue={lead.notes ?? ""} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
      <form action={async () => deleteLead(lead.id)}>
        <Button type="submit" variant="danger" className="w-full">
          Delete lead
        </Button>
      </form>
    </div>
  );
}
