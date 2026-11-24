import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { openJson, sealJson } from "@/lib/crypto/user-keys";
import { getDb } from "@/lib/db/client";
import { profile, sosEvent } from "@/lib/db/schema";
import { displayNameOf } from "@/lib/user-name";
import type { Fix } from "./links";
import { hashToken, newToken } from "./tokens";

const VIEW_HOURS = 24;
export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000),
  at: z.number().optional(),
});

export async function createSos(userId: string, fix: Fix | null) {
  const { token, hash } = newToken();
  const location = fix ? await sealJson(userId, "location", { ...locationSchema.parse(fix), at: Date.now() }) : null;
  const [event] = await getDb()
    .insert(sosEvent)
    .values({ userId, location, viewTokenHash: hash, viewExpiresAt: new Date(Date.now() + VIEW_HOURS * 3_600_000) })
    .returning({ id: sosEvent.id, createdAt: sosEvent.createdAt });
  return { event, viewToken: token };
}

export async function getSos(userId: string, id: string) {
  const [row] = await getDb()
    .select()
    .from(sosEvent)
    .where(and(eq(sosEvent.id, id), eq(sosEvent.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function updateSosLocation(userId: string, id: string, fix: Fix) {
  const location = await sealJson(userId, "location", { ...locationSchema.parse(fix), at: Date.now() });
  const updated = await getDb()
    .update(sosEvent)
    .set({ location })
    .where(and(eq(sosEvent.id, id), eq(sosEvent.userId, userId), eq(sosEvent.status, "active")))
    .returning({ id: sosEvent.id });
  return updated.length > 0;
}

export async function resolveSos(userId: string, id: string) {
  const updated = await getDb()
    .update(sosEvent)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(and(eq(sosEvent.id, id), eq(sosEvent.userId, userId), eq(sosEvent.status, "active")))
    .returning({ id: sosEvent.id });
  return updated.length > 0;
}

/** What a trusted contact sees on the alert page. Only reachable with the event's secret link. */
export async function sosForViewToken(token: string) {
  if (!token || token.length < 20) return null;
  const [row] = await getDb()
    .select({ event: sosEvent, phone: profile.phone })
    .from(sosEvent)
    .leftJoin(profile, eq(profile.userId, sosEvent.userId))
    .where(and(eq(sosEvent.viewTokenHash, hashToken(token)), gt(sosEvent.viewExpiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  const location = row.event.location ? await openJson(row.event.userId, "location", row.event.location, locationSchema).catch(() => null) : null;
  return {
    id: row.event.id,
    status: row.event.status,
    createdAt: row.event.createdAt,
    resolvedAt: row.event.resolvedAt,
    userName: await displayNameOf(row.event.userId),
    phone: row.phone ?? null,
    location,
  };
}
