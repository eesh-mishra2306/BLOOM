import { z } from "zod";
import { problem, readJson } from "@/lib/http";
import { acknowledge } from "@/lib/safety/dispatch";

/** A trusted contact tells the sender they're responding. */
export async function POST(req: Request) {
  const parsed = await readJson(req, z.object({ d: z.string().max(64), r: z.string().max(128) }));
  if (!parsed.ok) return parsed.response;
  const okay = await acknowledge(parsed.data.d, parsed.data.r);
  return okay ? new Response(null, { status: 204 }) : problem(404, "not_found", "This alert link isn't valid any more.");
}
