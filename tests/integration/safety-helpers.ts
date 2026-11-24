import type { PushPayload, PushSender } from "@/lib/safety/dispatch";
import { addContact, addContactDevice, respondToInvite } from "@/lib/safety/contacts";

export function fakeSender() {
  const sent: { endpoint: string; payload: PushPayload }[] = [];
  const sender: PushSender = {
    async send(device, payload) {
      sent.push({ endpoint: device.endpoint, payload });
      return { ok: true };
    },
  };
  return { sender, sent };
}

export const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: "p256dh-key", auth: "auth-key" } });

export async function acceptedContact(userId: string, name: string, endpoint?: string) {
  const { contact, inviteToken } = await addContact(userId, { name, phone: "+91 98765 43210" });
  await respondToInvite(inviteToken, true);
  if (endpoint) await addContactDevice(inviteToken, sub(endpoint));
  return contact;
}
