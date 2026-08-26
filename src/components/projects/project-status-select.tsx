"use client";

import { useRef, useState } from "react";
import { setProjectStatus } from "@/lib/actions/projects";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/work";
import { PROJECT_STATUS_STYLE } from "@/lib/project-style";

export function ProjectStatusSelect({ id, status }: { id: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const style = PROJECT_STATUS_STYLE[current] ?? PROJECT_STATUS_STYLE.planning;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.72rem] font-bold uppercase tracking-wide transition-colors"
        style={{ borderColor: style.bar, backgroundColor: style.wash, color: style.text }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.bar }} />
        {pending ? "Saving…" : PROJECT_STATUS_LABELS[current as never] ?? current}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 flex flex-col gap-0.5 rounded-lg border border-border bg-surface p-1 shadow-xl">
            {PROJECT_STATUSES.map((s) => {
              const sStyle = PROJECT_STATUS_STYLE[s];
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
                      await setProjectStatus(id, s);
                    } catch (err) {
                      // A failed write must not leave the pill stuck on
                      // "Saving…" forever, nor showing a status that was
                      // never actually saved.
                      setCurrent(previous);
                      setError(err instanceof Error ? err.message : "Couldn't save that status — try again.");
                    } finally {
                      setPending(false);
                    }
                  }}
                  className="flex items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-[0.78rem] font-semibold transition-colors hover:bg-surface-hover"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sStyle.bar }} />
                  {PROJECT_STATUS_LABELS[s]}
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
