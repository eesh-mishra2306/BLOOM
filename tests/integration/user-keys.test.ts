import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { DecryptError } from "@/lib/crypto/envelope";
import { getUserKey, openJson, sealJson, shredUserKey } from "@/lib/crypto/user-keys";
import { getDb } from "@/lib/db/client";
import { userKey } from "@/lib/db/schema";
import { createTestUser, resetDb } from "./helpers";

const Log = z.object({ flow: z.string(), cramps: z.number() });

describe("per-user data keys", () => {
  beforeEach(resetDb);

  it("creates one wrapped key per user on first use and reuses it", async () => {
    const userId = await createTestUser();
    const a = await getUserKey(userId);
    const b = await getUserKey(userId);
    expect(a.equals(b)).toBe(true);
    const rows = await getDb().select().from(userKey).where(eq(userKey.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0].wrappedKey.startsWith("v1.")).toBe(true);
  });

  it("round-trips a JSON payload for its owner", async () => {
    const userId = await createTestUser();
    const sealed = await sealJson(userId, "cycle_day", { flow: "heavy", cramps: 2 });
    expect(sealed).not.toContain("heavy");
    await expect(openJson(userId, "cycle_day", sealed, Log)).resolves.toEqual({ flow: "heavy", cramps: 2 });
  });

  it("will not open another user's payload", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    const sealed = await sealJson(alice, "journal", { flow: "x", cramps: 0 });
    await expect(openJson(bob, "journal", sealed, Log)).rejects.toThrow(DecryptError);
  });

  it("will not open a payload under a different purpose", async () => {
    const userId = await createTestUser();
    const sealed = await sealJson(userId, "journal", { flow: "x", cramps: 0 });
    await expect(openJson(userId, "cycle_day", sealed, Log)).rejects.toThrow(DecryptError);
  });

  it("makes old payloads unreadable after the key is shredded", async () => {
    const userId = await createTestUser();
    const sealed = await sealJson(userId, "mood", { flow: "x", cramps: 1 });
    const before = await getUserKey(userId);
    await shredUserKey(userId);
    await expect(openJson(userId, "mood", sealed, Log)).rejects.toThrow(DecryptError);
    const after = await getUserKey(userId);
    expect(after.equals(before)).toBe(false);
  });
});
