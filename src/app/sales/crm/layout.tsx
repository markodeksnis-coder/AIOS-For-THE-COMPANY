import { db } from "@/lib/db";
import { LogCallFab } from "@/components/crm/log-call-fab";

export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const leads = await db.lead.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <>
      {children}
      <LogCallFab leads={leads} />
    </>
  );
}
