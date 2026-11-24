import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { profile, user } from "@/lib/db/schema";

/** The name a person chose to show (falls back to their account name). */
export async function displayNameOf(userId: string): Promise<string> {
  const [row] = await getDb()
    .select({ display: profile.displayName, name: user.name })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(eq(user.id, userId))
    .limit(1);
  return row?.display || row?.name || "Your friend";
}
