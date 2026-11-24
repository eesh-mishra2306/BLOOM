import "server-only";
import { getDb } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

export type AuditAction =
  | "consent.changed"
  | "sos.created"
  | "sos.resolved"
  | "contact.invited"
  | "contact.accepted"
  | "contact.removed"
  | "journey.started"
  | "journey.escalated"
  | "data.exported"
  | "account.deleted"
  | "memory.cleared";

/** Records that something happened — never what the user wrote. Failures never break the request. */
export async function audit(userId: string | null, action: AuditAction, meta: Record<string, string | number | boolean | null> = {}) {
  try {
    await getDb().insert(auditLog).values({ userId, action, meta });
  } catch (err) {
    console.error("audit write failed", action, err instanceof Error ? err.message : err);
  }
}
