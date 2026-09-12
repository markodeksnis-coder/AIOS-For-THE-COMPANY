"use client";

import { useTransition } from "react";
import { toggleDeliveryTick } from "@/lib/actions/delivery";
import type { DetailCheckItem } from "@/lib/delivery";

export function TickItem({ clientId, item, last }: { clientId: string; item: DetailCheckItem; last?: boolean }) {
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => toggleDeliveryTick(clientId, item.day, item.index, item.fallback))}
      className={`grid w-full grid-cols-[18px_1fr] items-start gap-2.5 px-[11px] py-[9px] text-left hover:bg-surface-hover ${
        last ? "" : "border-b border-border"
      }`}
    >
      <span
        className={`mt-px grid h-4 w-4 place-items-center rounded-[5px] border text-[0.6rem] font-extrabold text-background ${
          item.ticked ? "border-good bg-good" : "border-white/20 bg-transparent"
        }`}
      >
        {item.ticked ? "✓" : ""}
      </span>
      <span className={`text-pretty text-[0.78rem] leading-snug ${item.ticked ? "text-text-faint line-through" : "text-foreground/90"}`}>
        {item.label}
      </span>
    </button>
  );
}
