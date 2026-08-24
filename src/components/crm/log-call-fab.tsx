"use client";

import { LogCallQuickSearch } from "@/components/crm/log-call-quick-search";

/** Floating "Log a call" button rendered on every CRM page (via the crm
 *  layout) so logging a call is always one click away, per the "under 20
 *  seconds" requirement — never buried on a specific lead's page. */
export function LogCallFab({ leads }: { leads: { id: string; name: string }[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-40 shadow-lg">
      <LogCallQuickSearch leads={leads} variant="primary" dropUp />
    </div>
  );
}
