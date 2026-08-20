"use client";

import { useState } from "react";
import { updateLead, deleteLead } from "@/lib/actions/leads";
import { Button, Label, TextArea, TextInput } from "@/components/ui/field";

export function LeadEditForm({
  lead,
}: {
  lead: { id: string; name: string; email: string | null; phone: string | null; source: string | null; tags: string; notes: string | null };
}) {
  const [pending, setPending] = useState(false);
  const tags = (() => {
    try {
      const parsed = JSON.parse(lead.tags);
      return Array.isArray(parsed) ? parsed.join(", ") : "";
    } catch {
      return "";
    }
  })();

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
          <Label>Source</Label>
          <TextInput name="source" defaultValue={lead.source ?? ""} />
        </div>
        <div>
          <Label>Tags</Label>
          <TextInput name="tags" defaultValue={tags} placeholder="comma-separated" />
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
