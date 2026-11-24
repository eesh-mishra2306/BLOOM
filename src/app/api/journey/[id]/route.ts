import { z } from "zod";
import { apiUser } from "@/lib/auth/session";
import { isCrossSite, ok, problem, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { arrive, checkIn, endJourney, extendJourney, getJourney, JourneyError, processJourney, updateJourneyLocation } from "@/lib/safety/journeys";
import { webPushSender } from "@/lib/safety/push";
import { locationSchema } from "@/lib/safety/sos";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("check_in") }),
  z.object({ action: z.literal("arrive") }),
  z.object({ action: z.literal("end") }),
  z.object({ action: z.literal("extend"), minutes: z.number().int().min(5).max(120) }),
  z.object({ action: z.literal("location"), location: locationSchema }),
]);

export async function GET(req: Request, { params }: RouteContext<"/api/journey/[id]">) {
  const user = await apiUser(req);
  if (!user) return problem(401, "unauthorized", "Sign in first.");
  const { id } = await params;
  const mine = await getJourney(user.id, id);
  if (!mine) return problem(404, "not_found", "That journey doesn't exist.");
  // Don't let a late scheduler hold up a missed check-in.
  await processJourney(id, new Date(), webPushSender());
  const journey = await getJourney(user.id, id);
  return ok({ journey }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request, { params }: RouteContext<"/api/journey/[id]">) {
  if (isCrossSite(req)) return problem(403, "cross_site", "Requests must come from BLOOM.");
  const user = await apiUser(req);
  if (!user) return problem(401, "unauthorized", "Sign in first.");
  const { id } = await params;
  const limit = await rateLimit(`journey:${user.id}`, 120, 600);
  if (!limit.ok) return problem(429, "rate_limited", "Too many updates. Wait a moment.", { retryAfter: limit.retryAfter });
  const parsed = await readJson(req, bodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const sender = webPushSender();
  try {
    switch (body.action) {
      case "check_in":
        return ok({ journey: await checkIn(user.id, id, sender) });
      case "extend":
        return ok({ journey: await extendJourney(user.id, id, body.minutes, sender) });
      case "arrive":
        return ok(await arrive(user.id, id, sender));
      case "end":
        return ok({ journey: await endJourney(user.id, id, sender) });
      case "location":
        return ok({ shared: await updateJourneyLocation(user.id, id, body.location) });
    }
  } catch (err) {
    if (err instanceof JourneyError) return problem(err.code === "not_found" ? 404 : 400, err.code, err.message);
    throw err;
  }
}
