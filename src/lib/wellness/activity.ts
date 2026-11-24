import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { wellnessActivity } from "@/lib/db/schema";

export type ActivityKind = (typeof wellnessActivity.$inferInsert)["kind"];

/**
 * Records something the user chose to do; each one grows a flower in Bloomverse.
 * Passing `refId` makes it idempotent (one flower per logged day, per journal entry…).
 */
export async function recordActivity(userId: string, kind: ActivityKind, refId?: string) {
  const db = getDb();
  if (refId) {
    const [existing] = await db
      .select({ id: wellnessActivity.id })
      .from(wellnessActivity)
      .where(and(eq(wellnessActivity.userId, userId), eq(wellnessActivity.kind, kind), eq(wellnessActivity.refId, refId)))
      .limit(1);
    if (existing) return;
  }
  await db.insert(wellnessActivity).values({ userId, kind, refId });
}

export async function listActivities(userId: string, since?: Date) {
  return getDb()
    .select({ id: wellnessActivity.id, kind: wellnessActivity.kind, refId: wellnessActivity.refId, completedAt: wellnessActivity.completedAt })
    .from(wellnessActivity)
    .where(since ? and(eq(wellnessActivity.userId, userId), gte(wellnessActivity.completedAt, since)) : eq(wellnessActivity.userId, userId))
    .orderBy(desc(wellnessActivity.completedAt))
    .limit(400);
}
