import "server-only";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { openMany, sealJson } from "@/lib/crypto/user-keys";
import { getDb } from "@/lib/db/client";
import { cycleDay } from "@/lib/db/schema";
import { recordActivity } from "@/lib/wellness/activity";
import { dayLogSchema, type DayLog } from "./types";

const payloadSchema = dayLogSchema.omit({ date: true });

async function read(userId: string, from?: string, to?: string): Promise<DayLog[]> {
  const conditions = [eq(cycleDay.userId, userId)];
  if (from) conditions.push(gte(cycleDay.date, from));
  if (to) conditions.push(lte(cycleDay.date, to));
  const rows = await getDb()
    .select({ date: cycleDay.date, payload: cycleDay.payload })
    .from(cycleDay)
    .where(and(...conditions))
    .orderBy(asc(cycleDay.date));
  const opened = await openMany(userId, "cycle_day", rows, payloadSchema);
  return opened.map(({ row, value }) => ({ date: row.date, ...value }));
}

export function getDayLogs(userId: string, from: string, to: string) {
  return read(userId, from, to);
}

export function getAllDayLogs(userId: string) {
  return read(userId);
}

export async function upsertDayLog(userId: string, input: DayLog): Promise<DayLog> {
  const log = dayLogSchema.parse(input);
  const { date, ...rest } = log;
  const payload = await sealJson(userId, "cycle_day", rest);
  await getDb()
    .insert(cycleDay)
    .values({ userId, date, payload })
    .onConflictDoUpdate({ target: [cycleDay.userId, cycleDay.date], set: { payload, updatedAt: new Date() } });
  await recordActivity(userId, "cycle_log", date);
  return log;
}

export async function deleteDayLog(userId: string, date: string) {
  await getDb()
    .delete(cycleDay)
    .where(and(eq(cycleDay.userId, userId), eq(cycleDay.date, date)));
}
