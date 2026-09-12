"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { parseJsonRecord, tickKey, type Platform, type SystemName } from "@/lib/delivery";

/** Flips one local override on top of a client's computed done/homeworkDone
 *  state — the same "local override" model the design mocked: a checked
 *  box doesn't rewrite done/homeworkDone, it just wins over the derived
 *  default until someone changes it again. */
export async function toggleDeliveryTick(clientId: string, day: number, index: number, fallback: boolean) {
  const client = await db.deliveryClient.findUniqueOrThrow({ where: { id: clientId } });
  const ticks = parseJsonRecord<boolean>(client.ticks);
  const key = tickKey(day, index);
  const current = key in ticks ? ticks[key] : fallback;
  ticks[key] = !current;

  await db.deliveryClient.update({ where: { id: clientId }, data: { ticks: JSON.stringify(ticks) } });

  revalidatePath("/delivery");
  revalidatePath("/delivery/clients");
  revalidatePath(`/delivery/journey/${clientId}`);
}

export async function assignDeliverySystem(clientId: string, system: SystemName, platform: Platform | null) {
  await db.deliveryClient.update({ where: { id: clientId }, data: { system, platform } });

  revalidatePath("/delivery");
  revalidatePath("/delivery/clients");
  revalidatePath("/delivery/assign");
  revalidatePath(`/delivery/journey/${clientId}`);
}
