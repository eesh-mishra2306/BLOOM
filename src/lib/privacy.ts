import "server-only";
import { desc, eq, like, or, sql } from "drizzle-orm";
import { listMemories } from "@/lib/ai/memory";
import { audit } from "@/lib/audit";
import { consentHistory, getConsents } from "@/lib/consent";
import { openJson, shredUserKey } from "@/lib/crypto/user-keys";
import { getAllDayLogs } from "@/lib/cycle/repo";
import { isoToday } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { appRateLimit, auditLog, profile, session, sosEvent, user, verification } from "@/lib/db/schema";
import { listContacts } from "@/lib/safety/contacts";
import { countUserDevices } from "@/lib/safety/devices";
import { getEmergencyInfo } from "@/lib/safety/emergency-info";
import { recentJourneys } from "@/lib/safety/journeys";
import { locationSchema } from "@/lib/safety/sos";
import { listActivities } from "@/lib/wellness/activity";
import { listGoals, listJournal, listMoods } from "@/lib/wellness/repo";

/**
 * Everything BLOOM holds about a person, decrypted, in one JSON document. Excludes secrets that
 * aren't theirs to read: password hashes, encryption keys, and push endpoints (which belong to
 * browser vendors' push services).
 */
export async function exportUserData(userId: string) {
  const db = getDb();
  const [account] = await db.select({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt }).from(user).where(eq(user.id, userId)).limit(1);
  const [prof] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  const timeZone = prof?.timeZone ?? "Asia/Kolkata";
  const sosRows = await db.select().from(sosEvent).where(eq(sosEvent.userId, userId)).orderBy(desc(sosEvent.createdAt));
  const sessions = await db
    .select({ createdAt: session.createdAt, expiresAt: session.expiresAt, userAgent: session.userAgent })
    .from(session)
    .where(eq(session.userId, userId));

  const [days, consents, history, moods, journal, goals, activities, memories, contacts, emergencyInfo, journeys, devices] = await Promise.all([
    getAllDayLogs(userId),
    getConsents(userId),
    consentHistory(userId),
    listMoods(userId, 10_000),
    listJournal(userId, undefined, 100_000),
    listGoals(userId, isoToday(timeZone)),
    listActivities(userId),
    listMemories(userId),
    listContacts(userId),
    getEmergencyInfo(userId),
    recentJourneys(userId, 10_000),
    countUserDevices(userId),
  ]);

  const { userId: _u, ...profileData } = prof ?? ({} as Record<string, unknown>);
  return {
    format: "bloom-export-v1" as const,
    exportedAt: new Date().toISOString(),
    account,
    profile: profileData,
    consents: { current: consents, history },
    cycle: { days },
    wellness: { moods, journal, goals, activities },
    companion: { memories },
    safety: {
      contacts: contacts.map(({ id, name, phone, email, relationship, status, acceptedAt, devices: d }) => ({ id, name, phone, email, relationship, status, acceptedAt, alertDevices: d })),
      emergencyInfo,
      sosEvents: await Promise.all(
        sosRows.map(async (s) => ({
          id: s.id,
          status: s.status,
          createdAt: s.createdAt,
          resolvedAt: s.resolvedAt,
          location: s.location ? await openJson(userId, "location", s.location, locationSchema).catch(() => null) : null,
        })),
      ),
      journeys: journeys.map(({ sharePath: _p, ...j }) => j),
    },
    devices: { reminderDevices: devices },
    sessions,
  };
}

export type UserExport = Awaited<ReturnType<typeof exportUserData>>;

/**
 * Deletes the account. The data key goes first, so anything sealed with it — including copies in
 * database backups — can no longer be read. Then the user row goes, and every row that belongs to
 * it with it. One anonymous note records that an account was deleted, nothing more.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const db = getDb();
  const [row] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  await shredUserKey(userId);
  await db.transaction(async (tx) => {
    await tx.delete(user).where(eq(user.id, userId));
    await tx.delete(auditLog).where(eq(auditLog.userId, userId));
    await tx.delete(appRateLimit).where(like(appRateLimit.key, `%${userId}%`));
    if (row?.email) await tx.delete(verification).where(or(eq(verification.identifier, row.email), like(verification.value, `%${userId}%`)));
    // Belt and braces: the keystore row should already be gone.
    await tx.execute(sql`DELETE FROM keystore.user_key WHERE user_id = ${userId}`);
  });
  await audit(null, "account.deleted");
}
