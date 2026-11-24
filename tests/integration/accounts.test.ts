import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getAuth } from "@/lib/auth/server";
import { consentHistory, getConsents, hasConsent, setConsent } from "@/lib/consent";
import { getDb } from "@/lib/db/client";
import { account, session } from "@/lib/db/schema";
import { ensureProfile, updateProfile } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";
import { createTestUser, resetDb } from "./helpers";

describe("accounts", () => {
  beforeEach(resetDb);

  it("signs up with email and password, hashing the password and opening a session", async () => {
    const res = await getAuth().api.signUpEmail({
      body: { email: "asha@example.com", password: "correct horse battery", name: "Asha" },
    });
    expect(res.user.email).toBe("asha@example.com");
    const [acct] = await getDb().select().from(account).where(eq(account.userId, res.user.id));
    expect(acct.providerId).toBe("credential");
    expect(acct.password).not.toContain("correct horse");
    const sessions = await getDb().select().from(session).where(eq(session.userId, res.user.id));
    expect(sessions).toHaveLength(1);
  });

  it("rejects passwords shorter than 10 characters", async () => {
    await expect(
      getAuth().api.signUpEmail({ body: { email: "short@example.com", password: "short1", name: "S" } }),
    ).rejects.toThrow();
  });
});

describe("consent", () => {
  beforeEach(resetDb);

  it("defaults every purpose to not granted", async () => {
    const userId = await createTestUser();
    const consents = await getConsents(userId);
    expect(Object.values(consents).every((v) => v === false)).toBe(true);
  });

  it("uses the latest choice and keeps the full history", async () => {
    const userId = await createTestUser();
    await setConsent(userId, "ai_chat", true);
    await setConsent(userId, "ai_chat", false);
    await setConsent(userId, "ai_chat", true);
    expect(await hasConsent(userId, "ai_chat")).toBe(true);
    expect(await hasConsent(userId, "ai_memory")).toBe(false);
    const history = await consentHistory(userId);
    expect(history.filter((h) => h.purpose === "ai_chat").map((h) => h.granted)).toEqual([true, false, true]);
  });
});

describe("profile", () => {
  beforeEach(resetDb);

  it("starts with India defaults and Mochi as the companion", async () => {
    const userId = await createTestUser();
    const p = await ensureProfile(userId);
    expect(p.country).toBe("IN");
    expect(p.timeZone).toBe("Asia/Kolkata");
    expect(p.companionName).toBe("Mochi");
    expect(p.sosCountdownSeconds).toBe(5);
    expect(p.onboardedAt).toBeNull();
  });

  it("rejects an SOS countdown outside 0–10 seconds", async () => {
    const userId = await createTestUser();
    await ensureProfile(userId);
    await expect(updateProfile(userId, { sosCountdownSeconds: 30 })).rejects.toThrow();
    const p = await updateProfile(userId, { sosCountdownSeconds: 0, displayName: "Asha" });
    expect(p.sosCountdownSeconds).toBe(0);
    expect(p.displayName).toBe("Asha");
  });
});

describe("rate limit", () => {
  beforeEach(resetDb);

  it("allows the limit, blocks the next request, and resets after the window", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit("test:key", 3, 1));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(results[3].retryAfter).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 1_100));
    expect((await rateLimit("test:key", 3, 1)).ok).toBe(true);
  });
});
