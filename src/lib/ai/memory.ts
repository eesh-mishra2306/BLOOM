import "server-only";
import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";
import { openMany, sealJson } from "@/lib/crypto/user-keys";
import { getDb } from "@/lib/db/client";
import { companionMemory } from "@/lib/db/schema";

const MAX_MEMORIES = 50;
const memorySchema = z.object({ text: z.string().min(1).max(280) });

export async function listMemories(userId: string) {
  const rows = await getDb()
    .select({ id: companionMemory.id, payload: companionMemory.payload, createdAt: companionMemory.createdAt })
    .from(companionMemory)
    .where(eq(companionMemory.userId, userId))
    .orderBy(asc(companionMemory.createdAt));
  const opened = await openMany(userId, "memory", rows, memorySchema);
  return opened.map(({ row, value }) => ({ id: row.id, text: value.text, createdAt: row.createdAt }));
}

export async function addMemory(userId: string, text: string) {
  const clean = memorySchema.parse({ text: text.trim().replace(/\s+/g, " ").slice(0, 280) });
  const [{ n }] = await getDb().select({ n: count() }).from(companionMemory).where(eq(companionMemory.userId, userId));
  if (n >= MAX_MEMORIES) throw new Error(`Mochi can keep up to ${MAX_MEMORIES} notes. Delete some in Privacy first.`);
  await getDb().insert(companionMemory).values({ userId, payload: await sealJson(userId, "memory", clean) });
}

export async function deleteMemory(userId: string, id: string) {
  await getDb()
    .delete(companionMemory)
    .where(and(eq(companionMemory.userId, userId), eq(companionMemory.id, id)));
}

export async function clearMemories(userId: string) {
  await getDb().delete(companionMemory).where(eq(companionMemory.userId, userId));
}
