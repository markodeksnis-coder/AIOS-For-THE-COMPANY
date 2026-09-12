import { db } from "@/lib/db";
import { blockedList, CALL_TARGET, PROGRAM_DAYS, toDeliveryClientData, todayISO } from "@/lib/delivery";
import { DeliveryTabs } from "@/components/delivery/delivery-tabs";

export const dynamic = "force-dynamic";

export default async function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const rows = await db.deliveryClient.findMany({ orderBy: { createdAt: "asc" } });
  const clients = rows.map(toDeliveryClientData);
  const today = todayISO();

  const blockedCount = blockedList(clients, today).length;
  const unassignedCount = clients.filter((c) => !c.system).length;

  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Delivery · {CALL_TARGET} calls in {PROGRAM_DAYS} days
        </div>
      </div>
      <DeliveryTabs blockedCount={blockedCount} clientCount={clients.length} unassignedCount={unassignedCount} />
      {children}
    </div>
  );
}
