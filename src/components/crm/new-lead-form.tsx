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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <TextInput name="name" placeholder="Lead name" required autoFocus />
          </div>
          <div>
            <Label>Source</Label>
            <TextInput name="source" placeholder="facebook ads, referral, organic…" />
          </div>
          <div>
            <Label>Email</Label>
            <TextInput name="email" type="email" placeholder="lead@example.com" />
          </div>
          <div>
            <Label>Phone</Label>
            <TextInput name="phone" placeholder="+1 555 0100" />
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
