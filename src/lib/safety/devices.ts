import "server-only";
import { and, count, eq } from "drizzle-orm";
import type { z } from "zod";
import { getDb } from "@/lib/db/client";
import { userDevice } from "@/lib/db/schema";
import { pushSubscriptionSchema } from "./contacts";
import type { PushPayload, PushSender } from "./dispatch";

/** Registers this browser for the user's own reminders. A shared phone moves to whoever signed in last. */
export async function addUserDevice(userId: string, subscription: z.input<typeof pushSubscriptionSchema>) {
  const sub = pushSubscriptionSchema.parse(subscription);
  await getDb()
    .insert(userDevice)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({ target: userDevice.endpoint, set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
}

export async function removeUserDevice(userId: string, endpoint: string) {
  await getDb()
    .delete(userDevice)
    .where(and(eq(userDevice.userId, userId), eq(userDevice.endpoint, endpoint)));
}

export async function countUserDevices(userId: string): Promise<number> {
  const [{ n }] = await getDb().select({ n: count() }).from(userDevice).where(eq(userDevice.userId, userId));
  return Number(n);
}

/** Pushes to every device the user registered; drops devices the push service says are gone. */
export async function pushToUser(userId: string, sender: PushSender | null, payload: PushPayload): Promise<number> {
  if (!sender) return 0;
  const db = getDb();
  const devices = await db.select().from(userDevice).where(eq(userDevice.userId, userId));
  let sent = 0;
  for (const device of devices) {
    const res = await sender.send(device, payload);
    if (res.ok) sent++;
    else if (res.gone) await db.delete(userDevice).where(eq(userDevice.id, device.id));
  }
  return sent;
}
