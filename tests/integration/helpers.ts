import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { user } from "@/lib/db/schema";

/** Wipes every table. User deletion cascades to all user-owned rows, including keys. */
export async function resetDb() {
  await getDb().execute(
    sql`TRUNCATE TABLE "user", "verification", "rate_limit", "app_rate_limit", "audit_log", "job_heartbeat", keystore."user_key" CASCADE`,
  );
}

export async function createTestUser(email = `user-${crypto.randomUUID()}@example.com`, name = "Test User") {
  const id = crypto.randomUUID();
  await getDb().insert(user).values({ id, email, name });
  return id;
}

/** Signs up through Better Auth and returns the session cookie, for testing route handlers. */
export async function signUp(name = "Asha") {
  const { getAuth } = await import("@/lib/auth/server");
  const res = await getAuth().api.signUpEmail({
    body: { email: `u-${crypto.randomUUID()}@example.com`, password: "a long enough password", name },
    asResponse: true,
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const body = await res.json();
  return { cookie, userId: body.user.id as string };
}
