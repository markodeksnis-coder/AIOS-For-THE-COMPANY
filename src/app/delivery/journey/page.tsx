import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DeliveryJourneyIndexPage() {
  const first = await db.deliveryClient.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!first) redirect("/delivery/assign");
  redirect(`/delivery/journey/${first.id}`);
}
