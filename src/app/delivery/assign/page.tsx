import { db } from "@/lib/db";
import { AssignWizard } from "@/components/delivery/assign-wizard";

export const dynamic = "force-dynamic";

export default async function DeliveryAssignPage() {
  const unassigned = await db.deliveryClient.findFirst({
    where: { system: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, business: true },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Assign a system</h1>
        <p className="mt-1 max-w-[76ch] text-[0.88rem] text-text-dim">
          The three-question SOP, in order. Each answer can end it early — that is the point of the ordering.
        </p>
      </div>
      <AssignWizard client={unassigned} />
    </div>
  );
}
