import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { openJson, sealJson } from "@/lib/crypto/user-keys";
import { getDb } from "@/lib/db/client";
import { emergencyInfo } from "@/lib/db/schema";

const field = (max: number) => z.string().trim().max(max).optional();

export const emergencyInfoSchema = z.object({
  bloodGroup: field(10),
  allergies: field(200),
  medications: field(200),
  conditions: field(200),
  notes: field(300),
});
export type EmergencyInfo = z.infer<typeof emergencyInfoSchema>;

export async function getEmergencyInfo(userId: string): Promise<EmergencyInfo | null> {
  const [row] = await getDb().select().from(emergencyInfo).where(eq(emergencyInfo.userId, userId)).limit(1);
  if (!row) return null;
  return openJson(userId, "emergency_info", row.payload, emergencyInfoSchema).catch(() => null);
}

export async function saveEmergencyInfo(userId: string, info: EmergencyInfo) {
  const clean = emergencyInfoSchema.parse(info);
  const payload = await sealJson(userId, "emergency_info", clean);
  await getDb()
    .insert(emergencyInfo)
    .values({ userId, payload })
    .onConflictDoUpdate({ target: emergencyInfo.userId, set: { payload, updatedAt: new Date() } });
}
