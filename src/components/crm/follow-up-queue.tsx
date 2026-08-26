"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Copy, Check, ChevronDown, ChevronUp, Mail, MessageSquare, Video } from "lucide-react";
import { markFollowUpSent } from "@/lib/actions/follow-ups";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/field";
import { formatCET } from "@/lib/crm";

export type QueuedDraft = { id: string; channel: string; content: string };

export type QueuedTouch = {
  id: string;
  leadId: string;
  leadName: string;
  templateName: string;
  dueAt: string; // ISO
  drafts: QueuedDraft[];
};

const CHANNEL_ICON = { email: Mail, sms: MessageSquare, loom_script: Video } as const;

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
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) return null;

  const hasDrafts = t.drafts.length > 0;

  return (
    <li className="rounded-lg border border-border/60">
      <div className="flex items-center gap-2 p-1.5 text-[0.8rem]">
        <span className="font-mono text-[0.7rem] text-text-faint">{formatCET(new Date(t.dueAt))}</span>
        <Link href={`/sales/crm/${t.leadId}`} className="flex-1 truncate font-semibold hover:text-accent-strong hover:underline">
          {t.leadName}
        </Link>
        <span className="hidden truncate text-text-faint sm:block sm:max-w-[140px]">{t.templateName}</span>
        {hasDrafts && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-[0.7rem] font-semibold text-accent-strong hover:underline"
          >
            {t.drafts.length} draft{t.drafts.length > 1 ? "s" : ""}
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
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
      </div>
      {open && hasDrafts && (
        <div className="flex flex-col gap-2 border-t border-border/60 p-2">
          {t.drafts.map((d) => (
            <DraftPreview key={d.id} draft={d} />
          ))}
        </div>
      )}
    </li>
  );
}

/** Shows the actual drafted copy inline with a one-click copy — the whole
 *  point of centralizing drafts onto the touch is that nothing has to be
 *  re-found on the lead's own page just to send a queued follow-up. */
function DraftPreview({ draft }: { draft: QueuedDraft }) {
  const [copied, setCopied] = useState(false);
  const Icon = CHANNEL_ICON[draft.channel as keyof typeof CHANNEL_ICON] ?? Mail;

  return (
    <div className="rounded-lg bg-surface-2 p-2.5">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon size={12} className="text-text-faint" />
        <span className="text-[0.68rem] font-bold uppercase tracking-wide text-text-faint">{draft.channel.replace("_", " ")}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(draft.content).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="ml-auto flex items-center gap-1 text-[0.7rem] font-semibold text-accent-strong hover:underline"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-[0.78rem] text-foreground">{draft.content}</p>
    </div>
  );
}
