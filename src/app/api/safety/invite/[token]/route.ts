import { z } from "zod";
import { audit } from "@/lib/audit";
import { isCrossSite, ok, problem, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { addContactDevice, findInvite, pushSubscriptionSchema, respondToInvite } from "@/lib/safety/contacts";
import { dispatchAlerts } from "@/lib/safety/dispatch";
import { webPushSender } from "@/lib/safety/push";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("decline") }),
  z.object({ action: z.literal("subscribe"), subscription: pushSubscriptionSchema }),
  z.object({ action: z.literal("test") }),
]);

/** Actions a trusted contact takes from their invite link. The link itself is the credential. */
export async function POST(req: Request, ctx: RouteContext<"/api/safety/invite/[token]">) {
  if (isCrossSite(req)) return problem(403, "cross_site", "This request came from another site.");
  const { token } = await ctx.params;
  const limit = await rateLimit(`invite:${token.slice(0, 16)}`, 20, 600);
  if (!limit.ok) return problem(429, "rate_limited", "Too many tries. Wait a few minutes.");
  const invite = await findInvite(token);
  if (!invite) return problem(404, "not_found", "This invite link has expired or was replaced. Ask for a new one.");
  const parsed = await readJson(req, body);
  if (!parsed.ok) return parsed.response;

  try {
    switch (parsed.data.action) {
      case "accept": {
        const { userId } = await respondToInvite(token, true);
        await audit(userId, "contact.accepted");
        return ok({ status: "accepted" });
      }
      case "decline":
        await respondToInvite(token, false);
        return ok({ status: "declined" });
      case "subscribe":
        await addContactDevice(token, parsed.data.subscription);
        return ok({ status: "subscribed" });
      case "test": {
        if (invite.status !== "accepted") return problem(409, "not_accepted", "Accept the invite first.");
        const sender = webPushSender();
        if (!sender) return problem(503, "push_not_configured", "Alerts aren't set up on this BLOOM server yet.");
        const [delivery] = await dispatchAlerts({ userId: (await respondToInvite(token, true)).userId, kind: "test", sender, url: `/circle/accept/${token}`, contactIds: [invite.contactId] });
        return ok({ status: delivery?.status ?? "failed" });
      }
    }
  } catch (err) {
    return problem(400, "invite_error", err instanceof Error ? err.message : "That didn't work.");
  }
}
