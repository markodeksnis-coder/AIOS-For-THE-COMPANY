"use client";

import { useRef, useState } from "react";
import { upsertOutreachLog } from "@/lib/actions/outreach";
import { SETTERS, SOURCES } from "@/lib/outreach";
import { Card } from "@/components/ui/card";
import { Button, Label, Select, TextInput } from "@/components/ui/field";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Logs (or corrects) one date+setter+source's numbers — upserts, so
 *  re-submitting the same date/setter/source updates that row instead of
 *  creating a duplicate. Shared by the Cold Outbound and Appointment
 *  Reporting tabs since both read the same OutreachLog rows. */
export function OutreachLogForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        + Log today&apos;s numbers
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <form
        ref={formRef}
        action={async (formData) => {
          setPending(true);
          await upsertOutreachLog(formData);
          formRef.current?.reset();
          setPending(false);
          setOpen(false);
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap gap-3">
          <div>
            <Label>Date</Label>
            <TextInput name="date" type="date" defaultValue={todayISO()} required className="w-36" />
          </div>
          <div>
            <Label>Setter</Label>
            <Select name="setter" required className="w-32">
              {SETTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Source</Label>
            <Select name="source" required className="w-32">
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField name="dmsSent" label="DMs sent" />
          <NumberField name="repliesReceived" label="Replies" />
          <NumberField name="positiveReplies" label="Positive replies" />
          <NumberField name="membersJoined" label="Members joined" />
          <NumberField name="appointmentsBooked" label="Appointments booked" />
          <NumberField name="shows" label="Shows" />
          <NumberField name="noShows" label="No-shows" />
          <NumberField name="cashCollected" label="Cash collected ($)" step="any" />
        </div>

        <div>
          <Label>Note</Label>
          <TextInput name="note" placeholder="Optional context…" />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function NumberField({ name, label, step = "1" }: { name: string; label: string; step?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <TextInput name={name} type="number" step={step} defaultValue={0} />
    </div>
  );
}
