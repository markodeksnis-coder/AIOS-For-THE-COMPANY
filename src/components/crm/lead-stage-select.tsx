"use client";

import { useState } from "react";
import { setLeadStage } from "@/lib/actions/leads";
import { LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_STAGE_STYLE } from "@/lib/crm";

export function LeadStageSelect({ id, stage }: { id: string; stage: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(stage);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const style = LEAD_STAGE_STYLE[current as keyof typeof LEAD_STAGE_STYLE] ?? LEAD_STAGE_STYLE.booked;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.72rem] font-bold uppercase tracking-wide transition-colors"
        style={{ borderColor: style.bar, backgroundColor: style.wash, color: style.text }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.bar }} />
        {pending ? "Saving…" : LEAD_STAGE_LABELS[current as keyof typeof LEAD_STAGE_LABELS] ?? current}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 flex flex-col gap-0.5 rounded-lg border border-border bg-surface p-1 shadow-xl">
            {LEAD_STAGES.map((s) => {
              const sStyle = LEAD_STAGE_STYLE[s];
              return (
                <button
                  key={s}
                  onClick={async () => {
                    const previous = current;
                    setOpen(false);
                    setCurrent(s);
                    setPending(true);
                    setError(null);
                    try {
                      await setLeadStage(id, s);
                    } catch (err) {
                      // A failed write must not leave the pill stuck on
                      // "Saving…" forever, nor showing a stage that was
                      // never actually saved.
                      setCurrent(previous);
                      setError(err instanceof Error ? err.message : "Couldn't save that stage — try again.");
                    } finally {
                      setPending(false);
                    }
                  }}
                  className="flex items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-[0.78rem] font-semibold transition-colors hover:bg-surface-hover"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sStyle.bar }} />
                  {LEAD_STAGE_LABELS[s]}
                </button>
              );
            })}
          </div>
        </>
      )}
      {error && (
        <p className="absolute left-0 top-full z-20 mt-1 whitespace-nowrap text-[0.68rem] font-semibold text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
