"use client";

import { useState } from "react";
import { createLead } from "@/lib/actions/leads";
import { Card } from "@/components/ui/card";
import { Button, Label, TextInput, TextArea } from "@/components/ui/field";

export function NewLeadForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="mb-4">
        + New lead
      </Button>
    );
  }

  return (
    <Card className="mb-4 p-4">
      <form
        action={async (formData) => {
          setPending(true);
          await createLead(formData);
        }}
        className="flex flex-col gap-3"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2">
            <Label>Name</Label>
            <TextInput name="name" placeholder="Lead name" required autoFocus />
          </div>
          <div>
            <Label>Email</Label>
            <TextInput name="email" type="email" placeholder="lead@example.com" />
          </div>
          <div>
            <Label>Phone</Label>
            <TextInput name="phone" placeholder="+1 555 0100" />
          </div>
          <div>
            <Label>Timezone</Label>
            <TextInput name="timezone" placeholder="ET, PT…" />
          </div>
          <div>
            <Label>Source</Label>
            <TextInput name="source" placeholder="facebook ads, referral…" />
          </div>
          <div>
            <Label>Funnel / campaign</Label>
            <TextInput name="funnel" placeholder="Q1 webinar…" />
          </div>
          <div>
            <Label>Rep</Label>
            <TextInput name="repName" placeholder="Who's working it" />
          </div>
          <div>
            <Label>Product interest</Label>
            <TextInput name="productInterest" placeholder="What they want" />
          </div>
          <div>
            <Label>Target price</Label>
            <TextInput name="targetPrice" type="number" min="0" step="0.01" />
          </div>
          <div>
            <Label>Deal value</Label>
            <TextInput name="dealValue" type="number" min="0" step="0.01" placeholder="For EV ranking" />
          </div>
          <div>
            <Label>Stage probability %</Label>
            <TextInput name="stageProbability" type="number" min="0" max="100" placeholder="0-100" />
          </div>
        </div>
        <div>
          <Label>Tags</Label>
          <TextInput name="tags" placeholder="hot, b2b, high-ticket (comma-separated)" />
        </div>
        <div>
          <Label>Notes</Label>
          <TextArea name="notes" rows={2} placeholder="Anything worth knowing before the call…" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add lead"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
