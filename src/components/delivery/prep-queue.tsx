"use client";

import { useTransition } from "react";
import { Card } from "@/components/ui/card";
import { toggleDeliveryTick } from "@/lib/actions/delivery";
import type { PrepItem } from "@/lib/delivery";

export function PrepQueue({ items }: { items: PrepItem[] }) {
  const [, startTransition] = useTransition();

  return (
    <Card className="px-4 pb-3 pt-1">
      {items.length === 0 && <div className="py-3 text-[0.83rem] text-text-dim">Nothing owed right now.</div>}
      {items.map((p, i) => (
        <button
          key={`${p.clientId}-${p.day}-${p.index}`}
          type="button"
          onClick={() => startTransition(() => toggleDeliveryTick(p.clientId, p.day, p.index, false))}
          className={`grid w-full grid-cols-[18px_1fr_auto_auto] items-center gap-3 py-2.5 text-left ${
            i < items.length - 1 ? "border-b border-border" : ""
          }`}
        >
          <span
            className={`grid h-4 w-4 place-items-center rounded-[5px] border text-[0.6rem] font-extrabold text-background ${
              p.ticked ? "border-good bg-good" : "border-white/20 bg-transparent"
            }`}
          >
            {p.ticked ? "✓" : ""}
          </span>
          <span className={`text-pretty text-[0.78rem] leading-snug ${p.ticked ? "text-text-faint line-through" : "text-foreground/90"}`}>
            {p.label}
          </span>
          <span className="text-[0.74rem] text-text-dim">{p.clientName}</span>
          <span className={`text-right font-mono text-[0.72rem] ${p.due === "due now" ? "text-critical" : p.sort <= 3 ? "text-warn" : "text-text-faint"}`}>
            {p.due}
          </span>
        </button>
      ))}
      <div className="pt-2.5 text-[0.72rem] text-text-faint">
        Everything you owe before the next call on each client. Ticking here is what clears the call&rsquo;s prep flag above.
      </div>
    </Card>
  );
}
