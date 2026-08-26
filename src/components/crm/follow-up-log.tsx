"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markFollowUpReplied, markFollowUpBooked, updateFollowUpWatch, deleteFollowUpTouch } from "@/lib/actions/follow-ups";
import { Card } from "@/components/ui/card";
import { Button, TextInput } from "@/components/ui/field";
import { formatCET } from "@/lib/crm";

export type LoggedTouch = {
  id: string;
  leadId: string;
  leadName: string;
  templateName: string;
  sentAt: string; // ISO
  repliedAt: string | null;
  watched: boolean;
  viewCount: number | null;
  bookedFromThis: boolean;
};

/** Sent history — every touch that's gone out, newest first, with inline
 *  actions to log a reply, a view count from Loom's dashboard, or that it
 *  led to a booked call. */
export function FollowUpLog({ touches }: { touches: LoggedTouch[] }) {
  const [editingWatch, setEditingWatch] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden">
      {touches.length === 0 ? (
        <div className="px-4 py-6 text-center text-[0.83rem] text-text-faint">No follow-ups logged yet.</div>
      ) : (
        touches.map((t) =>
          editingWatch === t.id ? (
            <WatchEditRow key={t.id} touch={t} onDone={() => setEditingWatch(null)} />
          ) : (
            <LogRow key={t.id} touch={t} onEditWatch={() => setEditingWatch(t.id)} />
          )
        )
      )}
    </Card>
  );
}

function LogRow({ touch: t, onEditWatch }: { touch: LoggedTouch; onEditWatch: () => void }) {
  const [replied, setReplied] = useState(!!t.repliedAt);
  const [booked, setBooked] = useState(t.bookedFromThis);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 text-[0.82rem] last:border-b-0">
      <span className="font-mono text-[0.7rem] text-text-faint">{formatCET(new Date(t.sentAt))}</span>
      <Link href={`/sales/crm/${t.leadId}`} className="min-w-[100px] flex-1 truncate font-bold hover:text-accent-strong hover:underline">
        {t.leadName}
      </Link>
      <span className="hidden truncate text-text-faint sm:block sm:max-w-[160px]">{t.templateName}</span>

      {replied ? (
        <span className="shrink-0 rounded-full bg-good-wash px-2 py-0.5 text-[0.68rem] font-bold text-good">Replied</span>
      ) : (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => startTransition(async () => { await markFollowUpReplied(t.id); setReplied(true); })}
          className="shrink-0 px-2 py-1 text-[0.7rem]"
        >
          Mark replied
        </Button>
      )}

      <button type="button" onClick={onEditWatch} className="shrink-0 text-[0.72rem] font-semibold text-text-faint hover:text-foreground">
        {t.watched ? `Watched${t.viewCount ? ` · ${t.viewCount} views` : ""}` : "Log view"}
      </button>

      {booked ? (
        <span className="shrink-0 rounded-full bg-accent-wash px-2 py-0.5 text-[0.68rem] font-bold text-accent-strong">Booked</span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => { await markFollowUpBooked(t.id); setBooked(true); })}
          className="shrink-0 text-[0.72rem] font-semibold text-text-faint hover:text-foreground"
        >
          Mark booked
        </button>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => deleteFollowUpTouch(t.id))}
        className="shrink-0 text-[0.72rem] font-semibold text-text-faint hover:text-critical"
      >
        Delete
      </button>
    </div>
  );
}

function WatchEditRow({ touch: t, onDone }: { touch: LoggedTouch; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [watched, setWatched] = useState(t.watched);

  return (
    <form
      action={async (formData) => {
        setPending(true);
        await updateFollowUpWatch(t.id, formData);
        setPending(false);
        onDone();
      }}
      className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-hover px-4 py-2.5 text-[0.82rem] last:border-b-0"
    >
      <span className="min-w-[100px] flex-1 truncate font-bold">{t.leadName}</span>
      <label className="flex shrink-0 items-center gap-1.5 text-[0.78rem] font-semibold">
        <input type="checkbox" name="watched" checked={watched} onChange={(e) => setWatched(e.target.checked)} className="h-4 w-4 accent-accent-strong" />
        Watched
      </label>
      <div className="w-24">
        <TextInput name="viewCount" type="number" min="0" placeholder="Views" defaultValue={t.viewCount ?? ""} />
      </div>
      <Button type="submit" disabled={pending} className="px-2.5 py-1 text-[0.72rem]">
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button type="button" variant="ghost" onClick={onDone} disabled={pending} className="px-2.5 py-1 text-[0.72rem]">
        Cancel
      </Button>
    </form>
  );
}
