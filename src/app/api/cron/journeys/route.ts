import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
import { problem } from "@/lib/http";
import { processJourneys } from "@/lib/safety/journeys";
import { webPushSender } from "@/lib/safety/push";

export const dynamic = "force-dynamic";

function authorised(req: Request, secret: string): boolean {
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Runs every minute (see vercel.json). Reminds travellers, alerts contacts after missed check-ins. */
export async function GET(req: Request) {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return problem(503, "not_configured", "Set CRON_SECRET to run journey checks.");
  if (!authorised(req, secret)) return problem(401, "unauthorized", "Wrong or missing cron secret.");
  const summary = await processJourneys(new Date(), webPushSender());
  return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
}
