"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markFollowUpSent } from "@/lib/actions/follow-ups";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/field";
import { formatCET } from "@/lib/crm";

export type QueuedTouch = {
  id: string;
  leadId: string;
  leadName: string;
  templateName: string;
  dueAt: string; // ISO
};

/** Today's/tomorrow's queue — everything due and not yet sent, with a
 *  one-click "Sent" action so logging doesn't require opening a form. */
export function FollowUpQueue({ title, touches, empty }: { title: string; touches: QueuedTouch[]; empty: string }) {
  return (
    <Card className="p-4">
      <h2 className="mb-2 text-[0.8rem] font-bold">
        {title} <span className="font-mono text-[0.68rem] font-normal text-text-faint">{touches.length}</span>
      </h2>
      {touches.length === 0 ? (
        <p className="text-[0.78rem] text-text-faint">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {touches.map((t) => (
            <QueueRow key={t.id} touch={t} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function QueueRow({ touch: t }: { touch: QueuedTouch }) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) return null;

  return (
    <li className="flex items-center gap-2 text-[0.8rem]">
      <span className="font-mono text-[0.7rem] text-text-faint">{formatCET(new Date(t.dueAt))}</span>
      <Link href={`/sales/crm/${t.leadId}`} className="flex-1 truncate font-semibold hover:text-accent-strong hover:underline">
        {t.leadName}
      </Link>
      <span className="hidden truncate text-text-faint sm:block sm:max-w-[140px]">{t.templateName}</span>
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await markFollowUpSent(t.id);
            setDone(true);
          })
        }
        className="shrink-0 px-2.5 py-1 text-[0.7rem]"
      >
        {pending ? "…" : "Sent"}
      </Button>
    </li>
  );
}
