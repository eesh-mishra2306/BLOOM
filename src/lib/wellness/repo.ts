import "server-only";
import { and, count, desc, eq, isNull, like } from "drizzle-orm";
import { z } from "zod";
import { open as openSealed, seal } from "@/lib/crypto/envelope";
import { getUserKey, openMany, sealJson } from "@/lib/crypto/user-keys";
import { getDb } from "@/lib/db/client";
import { journalEntry, moodCheckin, wellnessActivity, wellnessGoal } from "@/lib/db/schema";
import { recordActivity } from "./activity";

export const MOOD_TAGS = ["rested", "grateful", "proud", "calm", "stressed", "anxious", "lonely", "overwhelmed", "angry", "tired"] as const;

export const moodSchema = z.object({
  mood: z.number().int().min(1).max(5),
  tags: z.array(z.string().max(24)).max(8),
  note: z.string().trim().max(500).optional(),
});
export type MoodInput = z.infer<typeof moodSchema>;

export async function saveMood(userId: string, input: MoodInput): Promise<string> {
  const value = moodSchema.parse(input);
  const [row] = await getDb()
    .insert(moodCheckin)
    .values({ userId, payload: await sealJson(userId, "mood", value) })
    .returning({ id: moodCheckin.id });
  await recordActivity(userId, "mood", row.id);
  return row.id;
}

export async function listMoods(userId: string, limit = 30) {
  const rows = await getDb()
    .select({ id: moodCheckin.id, payload: moodCheckin.payload, createdAt: moodCheckin.createdAt })
    .from(moodCheckin)
    .where(eq(moodCheckin.userId, userId))
    .orderBy(desc(moodCheckin.createdAt), desc(moodCheckin.id))
    .limit(limit);
  const opened = await openMany(userId, "mood", rows, moodSchema);
  return opened.map(({ row, value }) => ({ id: row.id, createdAt: row.createdAt, ...value }));
}

export const journalSchema = z.object({
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(1, "Write something first").max(10_000),
  mood: z.number().int().min(1).max(5).optional(),
});
export type JournalInput = z.infer<typeof journalSchema> & { id?: string };

export async function saveJournal(userId: string, input: JournalInput): Promise<string> {
  const { id, ...rest } = input;
  const value = journalSchema.parse(rest);
  const payload = await sealJson(userId, "journal", { ...value, title: value.title || undefined });
  const db = getDb();
  if (id) {
    await db
      .update(journalEntry)
      .set({ payload })
      .where(and(eq(journalEntry.id, id), eq(journalEntry.userId, userId)));
    return id;
  }
  const [row] = await db.insert(journalEntry).values({ userId, payload }).returning({ id: journalEntry.id });
  await recordActivity(userId, "journal", row.id);
  return row.id;
}

/** Decrypts this user's entries and searches them in memory — the database never sees the words. */
export async function listJournal(userId: string, query?: string, limit = 500) {
  const rows = await getDb()
    .select({ id: journalEntry.id, payload: journalEntry.payload, createdAt: journalEntry.createdAt, updatedAt: journalEntry.updatedAt })
    .from(journalEntry)
    .where(eq(journalEntry.userId, userId))
    .orderBy(desc(journalEntry.createdAt), desc(journalEntry.id))
    .limit(limit);
  const opened = await openMany(userId, "journal", rows, journalSchema);
  const q = query?.trim().toLowerCase();
  return opened
    .map(({ row, value }) => ({ id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt, ...value }))
    .filter((e) => !q || e.body.toLowerCase().includes(q) || e.title?.toLowerCase().includes(q));
}

export async function deleteJournal(userId: string, id: string) {
  await getDb()
    .delete(journalEntry)
    .where(and(eq(journalEntry.id, id), eq(journalEntry.userId, userId)));
}

const MAX_GOALS = 12;
export const goalSchema = z.object({ label: z.string().trim().min(1).max(60), icon: z.string().max(20).default("sprout") });

export async function addGoal(userId: string, input: z.input<typeof goalSchema>): Promise<string> {
  const value = goalSchema.parse(input);
  const db = getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(wellnessGoal)
    .where(and(eq(wellnessGoal.userId, userId), isNull(wellnessGoal.archivedAt)));
  if (n >= MAX_GOALS) throw new Error(`You can keep up to ${MAX_GOALS} gentle goals.`);
  const key = await getUserKey(userId);
  const [row] = await db
    .insert(wellnessGoal)
    .values({ userId, label: seal(value.label, key, `goal:${userId}`), icon: value.icon })
    .returning({ id: wellnessGoal.id });
  return row.id;
}

export async function archiveGoal(userId: string, goalId: string) {
  await getDb()
    .update(wellnessGoal)
    .set({ archivedAt: new Date() })
    .where(and(eq(wellnessGoal.id, goalId), eq(wellnessGoal.userId, userId)));
}

export async function listGoals(userId: string, today: string) {
  const db = getDb();
  const goals = await db
    .select()
    .from(wellnessGoal)
    .where(and(eq(wellnessGoal.userId, userId), isNull(wellnessGoal.archivedAt)))
    .orderBy(wellnessGoal.createdAt);
  if (goals.length === 0) return [];
  const key = await getUserKey(userId);
  const done = await db
    .select({ refId: wellnessActivity.refId })
    .from(wellnessActivity)
    .where(and(eq(wellnessActivity.userId, userId), eq(wellnessActivity.kind, "goal")));
  return goals.flatMap((g) => {
    let label: string;
    try {
      label = openSealed(g.label, key, `goal:${userId}`);
    } catch {
      return [];
    }
    const mine = done.filter((d) => d.refId?.startsWith(`${g.id}:`));
    return [{ id: g.id, label, icon: g.icon, timesDone: mine.length, doneToday: mine.some((d) => d.refId === `${g.id}:${today}`) }];
  });
}

export async function completeGoal(userId: string, goalId: string, date: string) {
  const [goal] = await getDb()
    .select({ id: wellnessGoal.id })
    .from(wellnessGoal)
    .where(and(eq(wellnessGoal.id, goalId), eq(wellnessGoal.userId, userId), isNull(wellnessGoal.archivedAt)))
    .limit(1);
  if (!goal) throw new Error("That goal doesn't exist.");
  await recordActivity(userId, "goal", `${goalId}:${date}`);
}

export async function goalCompletions(userId: string, goalId: string) {
  const [{ n }] = await getDb()
    .select({ n: count() })
    .from(wellnessActivity)
    .where(and(eq(wellnessActivity.userId, userId), like(wellnessActivity.refId, `${goalId}:%`)));
  return Number(n);
}
