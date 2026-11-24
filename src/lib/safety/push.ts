import "server-only";
import { sendNotification, setVapidDetails } from "web-push";
import { getEnv } from "@/lib/env";
import type { PushSender } from "./dispatch";

/** Web Push sender using the VAPID keys in the environment, or null when they aren't set. */
export function webPushSender(): PushSender | null {
  const env = getEnv();
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return null;
  setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  return {
    async send(device, payload) {
      try {
        await sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(payload), {
          TTL: payload.kind === "sos" || payload.kind === "journey_missed" ? 3600 : 900,
          urgency: "high",
          timeout: 10_000,
        });
        return { ok: true };
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        return { ok: false, gone: code === 404 || code === 410, error: code ? `Push service returned ${code}` : "Couldn't reach the push service" };
      }
    },
  };
}

export function vapidPublicKey(): string | null {
  return getEnv().VAPID_PUBLIC_KEY ?? null;
}
