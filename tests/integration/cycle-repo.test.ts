import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteDayLog, getAllDayLogs, getDayLogs, upsertDayLog } from "@/lib/cycle/repo";
import { getDb } from "@/lib/db/client";
import { cycleDay, wellnessActivity } from "@/lib/db/schema";
import { createTestUser, resetDb } from "./helpers";

const log = { date: "2026-11-20", flow: "heavy" as const, cramps: 3 as const, moods: ["tired" as const], symptoms: ["cramps" as const], note: "rough day" };

describe("cycle repository", () => {
  beforeEach(resetDb);

  it("saves a day log encrypted and reads it back", async () => {
    const userId = await createTestUser();
    await upsertDayLog(userId, log);
    const [row] = await getDb().select().from(cycleDay).where(eq(cycleDay.userId, userId));
    expect(row.payload).not.toMatch(/heavy|rough|cramps/);
    expect(await getAllDayLogs(userId)).toEqual([log]);
  });

  it("replaces the log for the same day instead of duplicating it", async () => {
    const userId = await createTestUser();
    await upsertDayLog(userId, log);
    await upsertDayLog(userId, { ...log, flow: "light", note: undefined });
    const all = await getAllDayLogs(userId);
    expect(all).toHaveLength(1);
    expect(all[0].flow).toBe("light");
  });

  it("returns only logs inside the requested range", async () => {
    const userId = await createTestUser();
    await upsertDayLog(userId, log);
    await upsertDayLog(userId, { ...log, date: "2026-10-01" });
    expect((await getDayLogs(userId, "2026-11-01", "2026-11-30")).map((l) => l.date)).toEqual(["2026-11-20"]);
  });

  it("never returns another user's logs", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    await upsertDayLog(alice, log);
    expect(await getAllDayLogs(bob)).toEqual([]);
    await deleteDayLog(bob, log.date);
    expect(await getAllDayLogs(alice)).toHaveLength(1);
  });

  it("grows one garden activity per logged day", async () => {
    const userId = await createTestUser();
    await upsertDayLog(userId, log);
    await upsertDayLog(userId, { ...log, cramps: 1 });
    const acts = await getDb().select().from(wellnessActivity).where(eq(wellnessActivity.userId, userId));
    expect(acts.filter((a) => a.kind === "cycle_log")).toHaveLength(1);
  });

  it("rejects an invalid log", async () => {
    const userId = await createTestUser();
    await expect(upsertDayLog(userId, { ...log, flow: "torrential" as never })).rejects.toThrow();
  });
});
