import { audit } from "@/lib/audit";
import { apiUser } from "@/lib/auth/session";
import { problem } from "@/lib/http";
import { exportUserData } from "@/lib/privacy";
import { rateLimit } from "@/lib/rate-limit";

/** Downloads everything BLOOM holds about the signed-in person as JSON. */
export async function GET(req: Request) {
  const user = await apiUser(req);
  if (!user) return problem(401, "unauthorized", "Sign in to download your data.");
  const limit = await rateLimit(`export:${user.id}`, 5, 3600);
  if (!limit.ok) return problem(429, "rate_limited", "You've downloaded your data a few times already. Try again in an hour.", { retryAfter: limit.retryAfter });
  const data = await exportUserData(user.id);
  await audit(user.id, "data.exported");
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bloom-export-${data.exportedAt.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
