import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { addMemory } from "@/lib/ai/memory";
import { audit } from "@/lib/audit";
import { setConsent } from "@/lib/consent";
import { upsertDayLog } from "@/lib/cycle/repo";
import { getDb } from "@/lib/db/client";
import { auditLog, user, userKey } from "@/lib/db/schema";
import { deleteAccount, exportUserData } from "@/lib/privacy";
import { rateLimit } from "@/lib/rate-limit";
import { addUserDevice } from "@/lib/safety/devices";
import { saveEmergencyInfo } from "@/lib/safety/emergency-info";
import { startJourney } from "@/lib/safety/journeys";
import { createSos } from "@/lib/safety/sos";
import { addGoal, saveJournal, saveMood } from "@/lib/wellness/repo";
import { resetDb, signUp } from "./helpers";
import { acceptedContact, sub } from "./safety-helpers";

async function livedInAccount() {
  const { userId } = await signUp("Asha");
  await setConsent(userId, "ai_chat", true);
  await upsertDayLog(userId, { date: "2026-11-20", flow: "medium", cramps: 2, symptoms: ["cramps"], moods: [], note: "Hot water bottle helped" });
  await saveMood(userId, { mood: 4, tags: ["calm"] });
  await saveJournal(userId, { title: "Monday", body: "Talked to Didi." });
  await addGoal(userId, { label: "Drink water", icon: "droplet" });
  await addMemory(userId, "Prefers chai to coffee");
  const priya = await acceptedContact(userId, "Priya", "https://push.example/priya");
  await saveEmergencyInfo(userId, { bloodGroup: "B+", allergies: "Penicillin" });
  await createSos(userId, { lat: 30.3, lng: 78.0, accuracy: 20 });
  await startJourney(userId, { destination: "Home", minutes: 20, checkInEveryMin: null, contactIds: [priya.id], shareLocation: false }, null);
  await addUserDevice(userId, sub("https://push.example/asha"));
  await audit(userId, "data.exported");
  await rateLimit(`chat:${userId}`, 30, 600);
  return userId;
}

describe("data export", () => {
  beforeEach(resetDb);

  it("contains the person's data, decrypted, with consent history", async () => {
    const userId = await livedInAccount();
    const data = await exportUserData(userId);
    expect(data.format).toBe("bloom-export-v1");
    expect(data.account).toMatchObject({ name: "Asha" });
    expect(data.cycle.days).toEqual([expect.objectContaining({ date: "2026-11-20", flow: "medium", note: "Hot water bottle helped" })]);
    expect(data.wellness.journal[0]).toMatchObject({ title: "Monday", body: "Talked to Didi." });
    expect(data.wellness.moods[0]).toMatchObject({ mood: 4 });
    expect(data.wellness.goals[0]).toMatchObject({ label: "Drink water" });
    expect(data.companion.memories[0]).toMatchObject({ text: "Prefers chai to coffee" });
    expect(data.safety.contacts[0]).toMatchObject({ name: "Priya", status: "accepted" });
    expect(data.safety.emergencyInfo).toMatchObject({ bloodGroup: "B+" });
    expect(data.safety.sosEvents[0].location).toMatchObject({ lat: 30.3 });
    expect(data.safety.journeys[0]).toMatchObject({ destination: "Home", status: "active" });
    expect(data.consents.history).toEqual([expect.objectContaining({ purpose: "ai_chat", granted: true })]);
  });

  it("never includes keys, password hashes or push endpoints", async () => {
    const userId = await livedInAccount();
    const text = JSON.stringify(await exportUserData(userId));
    expect(text).not.toMatch(/wrapped|password|push\.example|p256dh|v1\.[A-Za-z0-9_-]+\./);
  });
});

describe("account deletion", () => {
  beforeEach(resetDb);

  it("destroys the key, removes every row the person owns, and leaves only an anonymous note", async () => {
    const userId = await livedInAccount();
    const other = await livedInAccount();
    await deleteAccount(userId);

    const db = getDb();
    expect(await db.select().from(user).where(eq(user.id, userId))).toHaveLength(0);
    expect(await db.select().from(userKey).where(eq(userKey.userId, userId))).toHaveLength(0);
    const leftovers = await db.execute<{ table_name: string; n: number }>(sql`
      SELECT c.table_name, (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM %I.%I WHERE user_id = %L', c.table_schema, c.table_name, ${userId}::text), false, true, '')))[1]::text::int AS n
      FROM information_schema.columns c
      WHERE c.column_name = 'user_id' AND c.table_schema IN ('public', 'keystore')`);
    expect(leftovers.rows.filter((r) => r.n > 0)).toEqual([]);
    const limits = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM app_rate_limit WHERE key LIKE ${"%" + userId + "%"}`);
    expect(limits.rows[0].n).toBe(0);
    const notes = await db.select().from(auditLog).where(eq(auditLog.action, "account.deleted"));
    expect(notes).toHaveLength(1);
    expect(notes[0].userId).toBeNull();
    expect(notes[0].meta).toEqual({});

    // Someone else's account is untouched.
    expect((await exportUserData(other)).wellness.journal).toHaveLength(1);
  });
});
