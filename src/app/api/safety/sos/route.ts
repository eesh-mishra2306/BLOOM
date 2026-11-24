import { z } from "zod";
import { audit } from "@/lib/audit";
import { apiUser } from "@/lib/auth/session";
import { hasConsent } from "@/lib/consent";
import { isCrossSite, ok, problem, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { dispatchAlerts } from "@/lib/safety/dispatch";
import { webPushSender } from "@/lib/safety/push";
import { createSos, locationSchema } from "@/lib/safety/sos";

const body = z.object({ location: locationSchema.nullable().optional() });

/** Starts an SOS: records it and alerts every accepted trusted contact right away. */
export async function POST(req: Request) {
  if (isCrossSite(req)) return problem(403, "cross_site", "This request came from another site.");
  const user = await apiUser(req);
  if (!user) return problem(401, "unauthenticated", "Sign in so BLOOM can alert your contacts. Calling and texting from this screen still work.");
  const limit = await rateLimit(`sos:${user.id}`, 10, 3600);
  if (!limit.ok) return problem(429, "rate_limited", "Too many SOS alerts in the last hour. Use the call and text buttons on this screen.");
  const parsed = await readJson(req, body);
  if (!parsed.ok) return parsed.response;

  const fix = parsed.data.location && (await hasConsent(user.id, "location_sos")) ? parsed.data.location : null;
  const sender = webPushSender();
  const { event, viewToken } = await createSos(user.id, fix);
  const deliveries = await dispatchAlerts({ userId: user.id, kind: "sos", sosEventId: event.id, sender, url: `/alert/${viewToken}` });
  await audit(user.id, "sos.created", { contacts: deliveries.length, sent: deliveries.filter((d) => d.status === "sent").length });
  return ok({ eventId: event.id, deliveries, locationShared: Boolean(fix), pushConfigured: Boolean(sender) }, { status: 201 });
}
