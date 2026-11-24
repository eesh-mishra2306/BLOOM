import { pgSchema, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Wrapped per-user data keys live in their own schema so operators can back them up on a
 * short retention (≤ 7 days) separate from data backups. Deleting a user deletes their key;
 * once key backups older than the deletion roll off, that user's data in any older data
 * backup can no longer be decrypted (crypto-shredding).
 */
export const keystore = pgSchema("keystore");

export const userKey = keystore.table("user_key", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  wrappedKey: text("wrapped_key").notNull(),
  keyId: text("key_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
