"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/field";
import { LeadPicker, type PickedLead } from "@/components/crm/lead-picker";

export function LogCallQuickSearch({
  leads,
  variant = "ghost",
  dropUp,
}: {
  leads: { id: string; name: string }[];
  variant?: "primary" | "ghost";
  dropUp?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function go(lead: PickedLead) {
    setOpen(false);
    router.push(`/sales/crm/${lead.id}#log-call`);
  }

  if (!open) {
    return (
      <Button variant={variant} onClick={() => setOpen(true)}>
        Log a call
      </Button>
    );
  }

  return (
    <LeadPicker
      leads={leads}
      onSelect={go}
      placeholder="Which lead?"
      autoFocus
      onEscape={() => setOpen(false)}
      className="w-56"
      dropUp={dropUp}
    />
  );
}
