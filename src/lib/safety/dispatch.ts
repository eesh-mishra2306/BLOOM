import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { alertDelivery, contactDevice } from "@/lib/db/schema";
import { displayNameOf } from "@/lib/user-name";
import { listContacts } from "./contacts";
import { newToken, tokenMatches } from "./tokens";

export type AlertKind = "sos" | "safe" | "journey_start" | "journey_missed" | "arrived" | "test";

export interface PushDevice {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  /** "checkin" goes only to the traveller's own devices, never to contacts. */
  kind: AlertKind | "checkin";
  title: string;
  body: string;
  url: string;
  tag: string;
  /** Delivery id and receipt token, so the contact's device can confirm it showed the alert. */
  d?: string;
  r?: string;
  /** Journey id, so a check-in reminder can offer "I'm okay" right on the notification. */
  j?: string;
}

export interface PushSender {
  send(device: PushDevice, payload: PushPayload): Promise<{ ok: true } | { ok: false; gone: boolean; error: string }>;
}

export type DeliveryStatus = "sent" | "delivered" | "failed" | "not_configured" | "no_device" | "invite_pending" | "declined";

export interface DeliveryView {
  contactId: string;
  contactName: string;
  status: DeliveryStatus;
  acknowledged: boolean;
  deliveryId?: string;
  error?: string;
}

function message(kind: AlertKind, name: string, detail?: string): { title: string; body: string } {
  switch (kind) {
    case "sos":
      return { title: `${name} sent an SOS`, body: `Tap to see ${name}'s location and how to help.` };
    case "safe":
      return { title: `${name} is safe now`, body: `${name} marked the SOS as resolved.` };
    case "journey_start":
      return { title: `${name} started a journey`, body: detail ? `Expected by ${detail}. Tap to follow along.` : "Tap to follow along." };
    case "journey_missed":
      return { title: `${name} missed a check-in`, body: "Tap to see the last update, then try calling." };
    case "arrived":
      return { title: `${name} arrived safely`, body: "The journey has ended." };
    case "test":
      return { title: "BLOOM test alert", body: `This is how alerts from ${name} will look.` };
  }
}

/**
 * Sends an alert to every accepted trusted contact (or the given subset) and records an honest
 * status for each: "sent" means a push service accepted it; "delivered" only arrives later, when
 * the contact's device reports it showed the alert.
 */
export async function dispatchAlerts(opts: {
  userId: string;
  kind: AlertKind;
  sender: PushSender | null;
  url: string;
  sosEventId?: string;
  journeyId?: string;
  contactIds?: string[];
  detail?: string;
  /** Replaces the standard wording, for messages that need to say exactly what happened. */
  text?: (name: string) => { title: string; body: string };
}): Promise<DeliveryView[]> {
  const db = getDb();
  const name = await displayNameOf(opts.userId);
  const contacts = (await listContacts(opts.userId)).filter((c) => !opts.contactIds || opts.contactIds.includes(c.id));
  const { title, body } = opts.text ? opts.text(name) : message(opts.kind, name, opts.detail);

  return Promise.all(
    contacts.map(async (contact): Promise<DeliveryView> => {
      if (contact.status !== "accepted") {
        return { contactId: contact.id, contactName: contact.name, status: contact.status === "pending" ? "invite_pending" : "declined", acknowledged: false };
      }
      const deliveryId = crypto.randomUUID();
      const receipt = newToken();
      const devices = await db.select().from(contactDevice).where(eq(contactDevice.contactId, contact.id));
      let status: DeliveryStatus;
      let error: string | undefined;
      if (!opts.sender) status = "not_configured";
      else if (devices.length === 0) status = "no_device";
      else {
        const url = `${opts.url}${opts.url.includes("?") ? "&" : "?"}d=${deliveryId}&r=${receipt.token}`;
        const payload: PushPayload = { kind: opts.kind, title, body, url, tag: `${opts.kind}-${opts.sosEventId ?? opts.journeyId ?? deliveryId}`, d: deliveryId, r: receipt.token };
        const results = await Promise.all(devices.map((d) => opts.sender!.send(d, payload)));
        await Promise.all(
          results.map((r, i) => (!r.ok && r.gone ? db.delete(contactDevice).where(eq(contactDevice.id, devices[i].id)) : null)),
        );
        if (results.some((r) => r.ok)) status = "sent";
        else {
          status = "failed";
          const first = results.find((r): r is { ok: false; gone: boolean; error: string } => !r.ok);
          error = first?.gone ? "Their device stopped accepting alerts. Ask them to open the invite link again." : first?.error;
        }
      }
      await db.insert(alertDelivery).values({
        id: deliveryId,
        userId: opts.userId,
        sosEventId: opts.sosEventId,
        journeyId: opts.journeyId,
        contactId: contact.id,
        kind: opts.kind,
        status: status as "sent" | "failed" | "not_configured" | "no_device",
        receiptTokenHash: receipt.hash,
        error,
      });
      return { contactId: contact.id, contactName: contact.name, status, acknowledged: false, deliveryId, error };
    }),
  );
}

async function deliveryForReceipt(deliveryId: string, receipt: string) {
  if (!/^[0-9a-f-]{36}$/i.test(deliveryId) || !receipt) return null;
  const [row] = await getDb().select().from(alertDelivery).where(eq(alertDelivery.id, deliveryId)).limit(1);
  if (!row?.receiptTokenHash || !tokenMatches(receipt, row.receiptTokenHash)) return null;
  return row;
}

/** Called by the contact's service worker after it shows the notification. */
export async function markDelivered(deliveryId: string, receipt: string): Promise<boolean> {
  const row = await deliveryForReceipt(deliveryId, receipt);
  if (!row) return false;
  await getDb()
    .update(alertDelivery)
    .set({ status: "delivered", deliveredAt: row.deliveredAt ?? new Date() })
    .where(eq(alertDelivery.id, row.id));
  return true;
}

/** The contact tapped "I'm on it". */
export async function acknowledge(deliveryId: string, receipt: string): Promise<boolean> {
  const row = await deliveryForReceipt(deliveryId, receipt);
  if (!row) return false;
  await getDb()
    .update(alertDelivery)
    .set({ status: "delivered", deliveredAt: row.deliveredAt ?? new Date(), acknowledgedAt: row.acknowledgedAt ?? new Date() })
    .where(eq(alertDelivery.id, row.id));
  return true;
}

export async function deliveriesFor(userId: string, where: { sosEventId?: string; journeyId?: string }): Promise<DeliveryView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(alertDelivery)
    .where(
      and(
        eq(alertDelivery.userId, userId),
        where.sosEventId ? eq(alertDelivery.sosEventId, where.sosEventId) : eq(alertDelivery.journeyId, where.journeyId ?? ""),
      ),
    );
  const names = new Map((await listContacts(userId)).map((c) => [c.id, c.name]));
  return rows.map((r) => ({
    contactId: r.contactId,
    contactName: names.get(r.contactId) ?? "A contact",
    status: r.status,
    acknowledged: Boolean(r.acknowledgedAt),
    deliveryId: r.id,
    error: r.error ?? undefined,
  }));
}
