import "server-only";
import { and, count, eq, gt, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { openJson, openMany, sealJson } from "@/lib/crypto/user-keys";
import { getDb } from "@/lib/db/client";
import { contactDevice, trustedContact } from "@/lib/db/schema";
import { displayNameOf } from "@/lib/user-name";
import { normalizePhone } from "./links";
import { hashToken, newToken } from "./tokens";

const MAX_CONTACTS = 8;
const INVITE_DAYS = 14;
const ACCEPTED_LINK_DAYS = 365;
const DAY = 86_400_000;

export const contactInputSchema = z.object({
  name: z.string().trim().min(1, "Add their name").max(40),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{6,20}$/, "Enter a phone number, like +91 98765 43210"),
  email: z.string().trim().email("Enter a valid email").max(120).optional().or(z.literal("").transform(() => undefined)),
  relationship: z.string().trim().max(30).optional(),
});
export type ContactInput = z.input<typeof contactInputSchema>;

const payloadSchema = z.object({ name: z.string(), phone: z.string(), email: z.string().optional(), relationship: z.string().optional() });

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  acceptedAt: Date | null;
  inviteExpiresAt: Date | null;
  devices: number;
}

export async function listContacts(userId: string): Promise<Contact[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(trustedContact)
    .where(and(eq(trustedContact.userId, userId), ne(trustedContact.status, "revoked")))
    .orderBy(trustedContact.createdAt);
  if (rows.length === 0) return [];
  const deviceCounts = await db
    .select({ contactId: contactDevice.contactId, n: count() })
    .from(contactDevice)
    .where(inArray(contactDevice.contactId, rows.map((r) => r.id)))
    .groupBy(contactDevice.contactId);
  const devices = new Map(deviceCounts.map((d) => [d.contactId, Number(d.n)]));
  const opened = await openMany(userId, "contact", rows, payloadSchema);
  return opened.map(({ row, value }) => ({
    id: row.id,
    ...value,
    status: row.status,
    acceptedAt: row.acceptedAt,
    inviteExpiresAt: row.inviteExpiresAt,
    devices: devices.get(row.id) ?? 0,
  }));
}

export async function addContact(userId: string, input: ContactInput): Promise<{ contact: Contact; inviteToken: string }> {
  const data = contactInputSchema.parse(input);
  const db = getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(trustedContact)
    .where(and(eq(trustedContact.userId, userId), ne(trustedContact.status, "revoked")));
  if (n >= MAX_CONTACTS) throw new Error(`You can add up to ${MAX_CONTACTS} trusted contacts.`);
  const value = { name: data.name, phone: normalizePhone(data.phone), email: data.email, relationship: data.relationship || undefined };
  const { token, hash } = newToken();
  const [row] = await db
    .insert(trustedContact)
    .values({ userId, payload: await sealJson(userId, "contact", value), status: "pending", inviteTokenHash: hash, inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * DAY) })
    .returning();
  return { contact: { id: row.id, ...value, status: "pending", acceptedAt: null, inviteExpiresAt: row.inviteExpiresAt, devices: 0 }, inviteToken: token };
}

/** A fresh invite link for a contact who hasn't accepted yet (old link stops working). */
export async function renewInvite(userId: string, contactId: string): Promise<string | null> {
  const { token, hash } = newToken();
  const updated = await getDb()
    .update(trustedContact)
    .set({ inviteTokenHash: hash, inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * DAY), status: "pending" })
    .where(and(eq(trustedContact.id, contactId), eq(trustedContact.userId, userId), ne(trustedContact.status, "accepted")))
    .returning({ id: trustedContact.id });
  return updated.length ? token : null;
}

export async function removeContact(userId: string, contactId: string) {
  await getDb()
    .delete(trustedContact)
    .where(and(eq(trustedContact.id, contactId), eq(trustedContact.userId, userId)));
}

async function rowForToken(token: string) {
  if (!token || token.length < 20) return null;
  const [row] = await getDb()
    .select()
    .from(trustedContact)
    .where(and(eq(trustedContact.inviteTokenHash, hashToken(token)), gt(trustedContact.inviteExpiresAt, new Date()), ne(trustedContact.status, "revoked")))
    .limit(1);
  return row ?? null;
}

export async function findInvite(token: string) {
  const row = await rowForToken(token);
  if (!row) return null;
  const [inviterName, contact] = await Promise.all([displayNameOf(row.userId), openJson(row.userId, "contact", row.payload, payloadSchema).catch(() => null)]);
  const [{ n }] = await getDb().select({ n: count() }).from(contactDevice).where(eq(contactDevice.contactId, row.id));
  return { contactId: row.id, status: row.status, inviterName, contactName: contact?.name ?? "", devices: Number(n) };
}

export async function respondToInvite(token: string, accept: boolean) {
  const row = await rowForToken(token);
  if (!row) throw new Error("This invite link has expired or was replaced.");
  await getDb()
    .update(trustedContact)
    .set(
      accept
        ? { status: "accepted", acceptedAt: row.acceptedAt ?? new Date(), inviteExpiresAt: new Date(Date.now() + ACCEPTED_LINK_DAYS * DAY) }
        : { status: "declined", acceptedAt: null },
    )
    .where(eq(trustedContact.id, row.id));
  return { userId: row.userId, contactId: row.id };
}

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(4).max(100) }),
});

export async function addContactDevice(token: string, subscription: z.input<typeof pushSubscriptionSchema>) {
  const sub = pushSubscriptionSchema.parse(subscription);
  const row = await rowForToken(token);
  if (!row || row.status !== "accepted") throw new Error("Accept the invite before turning on alerts.");
  await getDb()
    .insert(contactDevice)
    .values({ contactId: row.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({ target: contactDevice.endpoint, set: { contactId: row.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  return { userId: row.userId, contactId: row.id };
}
