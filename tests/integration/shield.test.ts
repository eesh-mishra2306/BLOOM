import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/client";
import { alertDelivery, contactDevice, trustedContact } from "@/lib/db/schema";
import { acknowledge, dispatchAlerts, markDelivered, type PushPayload, type PushSender } from "@/lib/safety/dispatch";
import { addContact, addContactDevice, findInvite, listContacts, removeContact, respondToInvite } from "@/lib/safety/contacts";
import { createSos, getSos, sosForViewToken } from "@/lib/safety/sos";
import { createTestUser, resetDb } from "./helpers";

function fakeSender(fail: Record<string, number> = {}) {
  const sent: { endpoint: string; payload: PushPayload }[] = [];
  const sender: PushSender = {
    async send(device, payload) {
      if (fail[device.endpoint]) return { ok: false, gone: fail[device.endpoint] === 410, error: `Push service returned ${fail[device.endpoint]}` };
      sent.push({ endpoint: device.endpoint, payload });
      return { ok: true };
    },
  };
  return { sender, sent };
}

const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: "p256dh-key", auth: "auth-key" } });

async function acceptedContact(userId: string, name: string, endpoint?: string) {
  const { contact, inviteToken } = await addContact(userId, { name, phone: "+91 98765 43210" });
  await respondToInvite(inviteToken, true);
  if (endpoint) await addContactDevice(inviteToken, sub(endpoint));
  return contact;
}

describe("trusted circle", () => {
  beforeEach(resetDb);

  it("stores contact details encrypted", async () => {
    const userId = await createTestUser();
    await addContact(userId, { name: "Priya", phone: "+919876543210", relationship: "Sister" });
    const [row] = await getDb().select().from(trustedContact).where(eq(trustedContact.userId, userId));
    expect(row.payload).not.toMatch(/Priya|9876543210|Sister/);
    expect(row.status).toBe("pending");
    expect((await listContacts(userId))[0]).toMatchObject({ name: "Priya", phone: "+919876543210", status: "pending", devices: 0 });
  });

  it("lets the contact accept through the invite link", async () => {
    const userId = await createTestUser("asha@example.com", "Asha");
    const { inviteToken } = await addContact(userId, { name: "Priya", phone: "+919876543210" });
    const invite = await findInvite(inviteToken);
    expect(invite?.inviterName).toBe("Asha");
    await respondToInvite(inviteToken, true);
    expect((await listContacts(userId))[0].status).toBe("accepted");
  });

  it("rejects unknown invite tokens", async () => {
    expect(await findInvite("not-a-real-token")).toBeNull();
  });

  it("won't register a device before the invite is accepted", async () => {
    const userId = await createTestUser();
    const { inviteToken } = await addContact(userId, { name: "Priya", phone: "+919876543210" });
    await expect(addContactDevice(inviteToken, sub("https://push.example/1"))).rejects.toThrow();
  });

  it("only lets the owner remove a contact", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    const c = await acceptedContact(alice, "Priya");
    await removeContact(bob, c.id);
    expect(await listContacts(alice)).toHaveLength(1);
    await removeContact(alice, c.id);
    expect(await listContacts(alice)).toHaveLength(0);
  });
});

describe("SOS dispatch", () => {
  beforeEach(resetDb);

  it("alerts accepted contacts only, with a link that identifies the delivery", async () => {
    const userId = await createTestUser("asha@example.com", "Asha");
    await acceptedContact(userId, "Priya", "https://push.example/priya");
    await addContact(userId, { name: "Meera", phone: "+919812345678" });
    const { event } = await createSos(userId, null);
    const { sender, sent } = fakeSender();
    const deliveries = await dispatchAlerts({ userId, kind: "sos", sosEventId: event.id, sender, url: "/alert/x" });
    expect(sent).toHaveLength(1);
    expect(sent[0].payload.title).toContain("Asha");
    expect(sent[0].payload.url).toMatch(/^\/alert\/x\?d=.+&r=.+/);
    expect(deliveries.map((d) => [d.contactName, d.status])).toEqual(
      expect.arrayContaining([
        ["Priya", "sent"],
        ["Meera", "invite_pending"],
      ]),
    );
  });

  it("reports contacts who haven't turned on alerts on any device", async () => {
    const userId = await createTestUser();
    await acceptedContact(userId, "Priya");
    const { event } = await createSos(userId, null);
    const [d] = await dispatchAlerts({ userId, kind: "sos", sosEventId: event.id, sender: fakeSender().sender, url: "/alert/x" });
    expect(d.status).toBe("no_device");
  });

  it("says alerts aren't set up when there is no push sender", async () => {
    const userId = await createTestUser();
    await acceptedContact(userId, "Priya", "https://push.example/priya");
    const { event } = await createSos(userId, null);
    const [d] = await dispatchAlerts({ userId, kind: "sos", sosEventId: event.id, sender: null, url: "/alert/x" });
    expect(d.status).toBe("not_configured");
  });

  it("drops a device the push service says is gone and reports the failure", async () => {
    const userId = await createTestUser();
    await acceptedContact(userId, "Priya", "https://push.example/gone");
    const { event } = await createSos(userId, null);
    const [d] = await dispatchAlerts({ userId, kind: "sos", sosEventId: event.id, sender: fakeSender({ "https://push.example/gone": 410 }).sender, url: "/alert/x" });
    expect(d.status).toBe("failed");
    expect(await getDb().select().from(contactDevice)).toHaveLength(0);
  });

  it("marks a delivery delivered only with its own receipt token", async () => {
    const userId = await createTestUser();
    await acceptedContact(userId, "Priya", "https://push.example/priya");
    const { event } = await createSos(userId, null);
    const { sender, sent } = fakeSender();
    await dispatchAlerts({ userId, kind: "sos", sosEventId: event.id, sender, url: "/alert/x" });
    const { d, r } = sent[0].payload;
    expect(await markDelivered(d!, "wrong-token")).toBe(false);
    expect(await markDelivered(d!, r!)).toBe(true);
    expect(await acknowledge(d!, r!)).toBe(true);
    const [row] = await getDb().select().from(alertDelivery);
    expect(row.status).toBe("delivered");
    expect(row.acknowledgedAt).not.toBeNull();
  });

  it("never returns another user's SOS", async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    const { event } = await createSos(alice, null);
    expect(await getSos(bob, event.id)).toBeNull();
    expect(await getSos(alice, event.id)).not.toBeNull();
  });

  it("shows the alert page the shared location, but only with the right token", async () => {
    const userId = await createTestUser("asha@example.com", "Asha");
    const { viewToken } = await createSos(userId, { lat: 12.97161, lng: 77.59456, accuracy: 20 });
    const view = await sosForViewToken(viewToken);
    expect(view?.userName).toBe("Asha");
    expect(view?.location).toMatchObject({ lat: 12.97161, lng: 77.59456 });
    expect(await sosForViewToken("nope")).toBeNull();
  });
});
