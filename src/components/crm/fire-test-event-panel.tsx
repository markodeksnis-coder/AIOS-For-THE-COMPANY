"use client";

import { useState } from "react";
import { fireFathomTestEvent } from "@/lib/actions/webhooks";
import { Button } from "@/components/ui/field";
import { LeadPicker } from "@/components/crm/lead-picker";

export function FireTestEventPanel({ leads }: { leads: { id: string; name: string }[] }) {
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function fire(leadId?: string) {
    setPicking(false);
    setPending(true);
    setResult(null);
    try {
      const res = (await fireFathomTestEvent(leadId)) as { matched?: boolean; unmatched?: boolean };
      setResult(
        res.matched
          ? "Matched — recording attached to the lead. Check its call history."
          : res.unmatched
            ? "No match — added to Unmatched calls below."
            : "Processed."
      );
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Failed to fire the test event.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {picking ? (
          <LeadPicker
            leads={leads}
            onSelect={(l) => fire(l.id)}
            placeholder="Which lead?"
            autoFocus
            onEscape={() => setPicking(false)}
            className="w-56"
          />
        ) : (
          <Button variant="ghost" onClick={() => setPicking(true)} disabled={pending}>
            Fire test event (matched)
          </Button>
        )}
        <Button variant="ghost" onClick={() => fire(undefined)} disabled={pending}>
          {pending ? "Firing…" : "Fire test event (unmatched)"}
        </Button>
      </div>
      {result && <p className="mt-2 text-[0.8rem] text-text-dim">{result}</p>}
    </div>
  );
}
