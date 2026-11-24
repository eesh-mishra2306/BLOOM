import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/client";
import { journalEntry, moodCheckin, wellnessActivity, wellnessGoal } from "@/lib/db/schema";
import { addGoal, completeGoal, deleteJournal, listGoals, listJournal, listMoods, saveJournal, saveMood } from "@/lib/wellness/repo";
import { createTestUser, resetDb } from "./helpers";

describe("wellness repository", () => {
  beforeEach(resetDb);

  it("stores mood check-ins encrypted and lists them newest first", async () => {
    const userId = await createTestUser();
    await saveMood(userId, { mood: 2, tags: ["stressed"], note: "exam week" });
    await saveMood(userId, { mood: 4, tags: [] });
    const [row] = await getDb().select().from(moodCheckin).where(eq(moodCheckin.userId, userId)).limit(1);
    expect(row.payload).not.toMatch(/stressed|exam/);
    expect((await listMoods(userId, 10)).map((m) => m.mood)).toEqual([4, 2]);
  });

  it("encrypts journal entries and finds them by words inside", async () => {
    const userId = await createTestUser();
    await saveJournal(userId, { title: "Monday", body: "Talked to Didi about the move." });
    await saveJournal(userId, { body: "Quiet day. Long walk." });
    const [row] = await getDb().select().from(journalEntry).where(eq(journalEntry.userId, userId)).limit(1);
    expect(row.payload).not.toMatch(/Didi|walk/);
    expect((await listJournal(userId, "didi")).map((e) => e.title)).toEqual(["Monday"]);
    expect(await listJournal(userId)).toHaveLength(2);
  });

  it("edits and deletes only the owner's journal entries", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    const id = await saveJournal(alice, { body: "first" });
    await saveJournal(bob, { id, body: "hijack" });
    expect((await listJournal(alice))[0].body).toBe("first");
    await deleteJournal(bob, id);
    expect(await listJournal(alice)).toHaveLength(1);
    await saveJournal(alice, { id, body: "edited" });
    expect((await listJournal(alice))[0].body).toBe("edited");
    await deleteJournal(alice, id);
    expect(await listJournal(alice)).toHaveLength(0);
  });

  it("keeps goal names encrypted and grows one flower per goal per day", async () => {
    const userId = await createTestUser();
    const goalId = await addGoal(userId, { label: "Drink water", icon: "droplet" });
    const [row] = await getDb().select().from(wellnessGoal).where(eq(wellnessGoal.userId, userId));
    expect(row.label).not.toContain("water");
    await completeGoal(userId, goalId, "2026-11-24");
    await completeGoal(userId, goalId, "2026-11-24");
    await completeGoal(userId, goalId, "2026-11-25");
    const goals = await listGoals(userId, "2026-11-25");
    expect(goals[0]).toMatchObject({ label: "Drink water", doneToday: true, timesDone: 2 });
    const acts = await getDb().select().from(wellnessActivity).where(eq(wellnessActivity.userId, userId));
    expect(acts.filter((a) => a.kind === "goal")).toHaveLength(2);
  });

  it("won't complete another user's goal", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    const goalId = await addGoal(alice, { label: "Stretch", icon: "sprout" });
    await expect(completeGoal(bob, goalId, "2026-11-24")).rejects.toThrow();
  });
});
