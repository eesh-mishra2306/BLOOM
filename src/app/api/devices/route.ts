import { z } from "zod";
import { apiUser } from "@/lib/auth/session";
import { isCrossSite, ok, problem, readJson } from "@/lib/http";
import { pushSubscriptionSchema } from "@/lib/safety/contacts";
import { addUserDevice, countUserDevices, removeUserDevice } from "@/lib/safety/devices";

/** This browser's push subscription, for the user's own journey reminders. */
export async function POST(req: Request) {
  if (isCrossSite(req)) return problem(403, "cross_site", "Requests must come from BLOOM.");
  const user = await apiUser(req);
  if (!user) return problem(401, "unauthorized", "Sign in first.");
  const parsed = await readJson(req, z.object({ subscription: pushSubscriptionSchema }));
  if (!parsed.ok) return parsed.response;
  await addUserDevice(user.id, parsed.data.subscription);
  return ok({ devices: await countUserDevices(user.id) });
}

export async function DELETE(req: Request) {
  if (isCrossSite(req)) return problem(403, "cross_site", "Requests must come from BLOOM.");
  const user = await apiUser(req);
  if (!user) return problem(401, "unauthorized", "Sign in first.");
  const parsed = await readJson(req, z.object({ endpoint: z.string().url().max(1000) }));
  if (!parsed.ok) return parsed.response;
  await removeUserDevice(user.id, parsed.data.endpoint);
  return ok({ devices: await countUserDevices(user.id) });
}
