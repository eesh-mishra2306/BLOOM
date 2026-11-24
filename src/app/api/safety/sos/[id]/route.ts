import { z } from "zod";
import { audit } from "@/lib/audit";
import { apiUser } from "@/lib/auth/session";
import { hasConsent } from "@/lib/consent";
import { isCrossSite, ok, problem, readJson } from "@/lib/http";
import { deliveriesFor, dispatchAlerts } from "@/lib/safety/dispatch";
import { webPushSender } from "@/lib/safety/push";
import { getSos, locationSchema, resolveSos, updateSosLocation } from "@/lib/safety/sos";

export async function GET(req: Request, ctx: RouteContext<"/api/safety/sos/[id]">) {
  const user = await apiUser(req);
  if (!user) return problem(401, "unauthenticated", "Sign in to see this SOS.");
  const { id } = await ctx.params;
  const event = await getSos(user.id, id);
  if (!event) return problem(404, "not_found", "That SOS doesn't exist.");
  return ok({ status: event.status, locationShared: Boolean(event.location), deliveries: await deliveriesFor(user.id, { sosEventId: id }) });
}

const patch = z.discriminatedUnion("action", [
  z.object({ action: z.literal("location"), location: locationSchema }),
  z.object({ action: z.literal("resolve") }),
]);

export async function PATCH(req: Request, ctx: RouteContext<"/api/safety/sos/[id]">) {
  if (isCrossSite(req)) return problem(403, "cross_site", "This request came from another site.");
  const user = await apiUser(req);
  if (!user) return problem(401, "unauthenticated", "Sign in to update this SOS.");
  const { id } = await ctx.params;
  const event = await getSos(user.id, id);
  if (!event) return problem(404, "not_found", "That SOS doesn't exist.");
  const parsed = await readJson(req, patch);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.action === "location") {
    if (!(await hasConsent(user.id, "location_sos"))) return problem(403, "consent_required", "Location sharing for SOS is turned off.");
    await updateSosLocation(user.id, id, parsed.data.location);
    return ok({ locationShared: true });
  }

  const resolved = await resolveSos(user.id, id);
  if (resolved) {
    const reached = (await deliveriesFor(user.id, { sosEventId: id })).filter((d) => d.status === "sent" || d.status === "delivered").map((d) => d.contactId);
    if (reached.length) await dispatchAlerts({ userId: user.id, kind: "safe", sender: webPushSender(), url: "/", contactIds: reached });
    await audit(user.id, "sos.resolved");
  }
  return ok({ status: "resolved" });
}
