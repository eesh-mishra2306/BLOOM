import "server-only";
import { eq } from "drizzle-orm";
import type { ZodType } from "zod";
import { getDb } from "@/lib/db/client";
import { userKey } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { newDataKey, open, seal, unwrapKey, wrapKey } from "./envelope";

/** What a sealed value is for. Part of the AAD, so a value can't be replayed under another purpose. */
export type SealPurpose =
  | "cycle_day"
  | "mood"
  | "journal"
  | "memory"
  | "emergency_info"
  | "contact"
  | "location"
  | "destination"
  | "goal";

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { key: Buffer; expires: number }>();

function masterKey(): Buffer {
  return Buffer.from(getEnv().BLOOM_MASTER_KEY, "base64");
}

async function readWrapped(userId: string) {
  const rows = await getDb().select().from(userKey).where(eq(userKey.userId, userId)).limit(1);
  return rows[0];
}

/** The user's data key, created and wrapped on first use. */
export async function getUserKey(userId: string): Promise<Buffer> {
  const hit = cache.get(userId);
  if (hit && hit.expires > Date.now()) return hit.key;

  let row = await readWrapped(userId);
  if (!row) {
    await getDb()
      .insert(userKey)
      .values({ userId, wrappedKey: wrapKey(newDataKey(), masterKey(), userId), keyId: getEnv().BLOOM_MASTER_KEY_ID })
      .onConflictDoNothing();
    // Re-read so two concurrent first uses agree on the same key.
    row = await readWrapped(userId);
    if (!row) throw new Error("Could not create a data key for this account");
  }
  const key = unwrapKey(row.wrappedKey, masterKey(), userId);
  cache.set(userId, { key, expires: Date.now() + CACHE_TTL_MS });
  return key;
}

/** Destroys the user's data key. Everything sealed with it becomes permanently unreadable. */
export async function shredUserKey(userId: string): Promise<void> {
  cache.delete(userId);
  await getDb().delete(userKey).where(eq(userKey.userId, userId));
}

export async function sealJson(userId: string, purpose: SealPurpose, value: unknown): Promise<string> {
  const key = await getUserKey(userId);
  return seal(JSON.stringify(value), key, `${purpose}:${userId}`);
}

export async function openJson<T>(userId: string, purpose: SealPurpose, sealed: string, schema: ZodType<T>): Promise<T> {
  const key = await getUserKey(userId);
  return schema.parse(JSON.parse(open(sealed, key, `${purpose}:${userId}`)));
}

/** Opens many values with one key lookup; values that fail to decrypt or parse are skipped. */
export async function openMany<T, R extends { payload: string }>(
  userId: string,
  purpose: SealPurpose,
  rows: R[],
  schema: ZodType<T>,
): Promise<Array<{ row: R; value: T }>> {
  if (rows.length === 0) return [];
  const key = await getUserKey(userId);
  const out: Array<{ row: R; value: T }> = [];
  for (const row of rows) {
    try {
      out.push({ row, value: schema.parse(JSON.parse(open(row.payload, key, `${purpose}:${userId}`))) });
    } catch {
      // A row that can't be opened is reported by callers as missing, never shown as garbage.
    }
  }
  return out;
}
