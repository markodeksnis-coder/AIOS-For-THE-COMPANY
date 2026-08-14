"use client";

import { useRef, useState, useTransition } from "react";
import type { ScorecardEntry } from "@prisma/client";
import { addScorecardEntry, deleteScorecardEntry } from "@/lib/actions/scorecards";
import { sortEntries, trend, type DeptKpi } from "@/lib/scorecards";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, Label, TextInput } from "@/components/ui/field";
import { Sparkline } from "@/components/scorecards/sparkline";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function KpiCard({
  department,
  kpi,
  entries,
}: {
  department: string;
  kpi: DeptKpi;
  entries: ScorecardEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const sorted = sortEntries(entries);
  const latest = sorted[0] ?? null;
  const direction = trend(entries);
  const sparkValues = [...sorted].reverse().slice(-12).map((e) => e.value);

  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-bold">{kpi.name}</div>
          <div className="text-[0.8rem] text-text-faint">Target: {kpi.target}</div>
        </div>
        <Badge variant={kpi.status === "draft" ? "sample" : "default"}>
          {kpi.status ?? "draft"}
        </Badge>
      </div>

      <div className="mb-3 flex items-center gap-4">
        {latest ? (
          <>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold tabular-nums">{latest.value}</span>
                {direction && (
                  <span
                    className={
                      direction === "up"
                        ? "text-good"
                        : direction === "down"
                          ? "text-critical"
                          : "text-text-faint"
                    }
                  >
                    {direction === "up" ? "↑" : direction === "down" ? "↓" : "→"}
                  </span>
                )}
              </div>
              <div className="font-mono text-[0.68rem] text-text-faint">{latest.period}</div>
            </div>
            {sparkValues.length >= 2 && <Sparkline values={sparkValues} />}
          </>
        ) : (
          <p className="text-[0.8rem] text-text-faint">No entries logged yet.</p>
        )}
      </div>

      {open ? (
        <form
          ref={formRef}
          action={async (formData) => {
            setPending(true);
            await addScorecardEntry(formData);
            formRef.current?.reset();
            setPending(false);
            setOpen(false);
          }}
          className="mb-3 flex flex-wrap items-end gap-2 border-t border-border pt-3"
        >
          <input type="hidden" name="department" value={department} />
          <input type="hidden" name="kpiName" value={kpi.name} />
          <div>
            <Label>Period</Label>
            <TextInput name="period" type="date" defaultValue={todayISO()} required className="w-36" />
          </div>
          <div>
            <Label>Value</Label>
            <TextInput name="value" type="number" step="any" required className="w-24" />
          </div>
          <div className="flex-1">
            <Label>Note</Label>
            <TextInput name="note" placeholder="Optional context…" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <Button variant="ghost" onClick={() => setOpen(true)} className="mb-3">
          + Log entry
        </Button>
      )}

      {sorted.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-border pt-2">
          {sorted.slice(0, 5).map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 text-[0.78rem] text-text-dim"
            >
              <span className="font-mono text-text-faint">{e.period}</span>
              <span className="font-semibold tabular-nums">{e.value}</span>
              {e.note && <span className="flex-1 truncate text-text-faint">{e.note}</span>}
              <button
                type="button"
                onClick={() => startTransition(() => deleteScorecardEntry(e.id, department))}
                className="ml-auto text-text-faint hover:text-critical"
                aria-label="Delete entry"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
