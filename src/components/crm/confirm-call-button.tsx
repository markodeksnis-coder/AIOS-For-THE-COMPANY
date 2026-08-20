"use client";

import { useState } from "react";
import { confirmLead } from "@/lib/actions/leads";

export function ConfirmCallButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      onClick={async () => {
        setPending(true);
        await confirmLead(id);
        setPending(false);
      }}
      disabled={pending}
      className="rounded-full border border-accent/40 bg-accent-wash px-3 py-1 text-[0.72rem] font-bold uppercase tracking-wide text-accent-strong transition-colors hover:bg-accent-wash/70"
    >
      {pending ? "Confirming…" : "Mark confirmed"}
    </button>
  );
}
