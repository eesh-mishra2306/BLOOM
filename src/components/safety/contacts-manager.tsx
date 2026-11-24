"use client";
import { Phone, Trash2, UserRoundPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { addTrustedContact, newInviteLink, removeTrustedContact } from "@/app/(app)/safety/actions";
import { ShareButtons } from "./share-buttons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InputField } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { telLink } from "@/lib/safety/links";
import { cn } from "@/lib/utils";

export type ContactRow = { id: string; name: string; phone: string; relationship?: string; status: "pending" | "accepted" | "declined" | "revoked"; devices: number };

function statusText(c: ContactRow) {
  if (c.status === "accepted") return c.devices > 0 ? `Gets alerts on ${c.devices} ${c.devices === 1 ? "device" : "devices"}` : "Accepted, but alerts aren't on for their phone yet";
  if (c.status === "declined") return "Declined alerts";
  return "Invite sent, not accepted yet";
}

function InviteShare({ name, phone, userName, url }: { name: string; phone: string; userName: string; url: string }) {
  const text = `Hi ${name}, I've added you as a trusted contact on BLOOM. If I ever send an SOS, you'd get an alert on your phone. Open this link to accept: ${url}`;
  return (
    <div className="space-y-3">
      <p className="text-fg">
        Send {name} this link. Once they accept and turn on alerts, {userName.split(" ")[0]}&apos;s SOS reaches their phone automatically.
      </p>
      <input readOnly value={url} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} className="h-12 w-full rounded-[var(--radius-field)] border border-line bg-surface-strong px-3 text-sm text-fg" />
      <ShareButtons text={text} phones={[phone]} title="BLOOM invite" copied="Invite copied" />
    </div>
  );
}

export function ContactsManager({ contacts, userName, pushConfigured }: { contacts: ContactRow[]; userName: string; pushConfigured: boolean }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", relationship: "" });
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ name: string; phone: string; url: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await addTrustedContact(form);
      if (!res.ok) return setError(res.error);
      setInvite({ name: form.name, phone: form.phone, url: res.inviteUrl });
      setForm({ name: "", phone: "", relationship: "" });
    });
  }

  return (
    <div>
      {!pushConfigured ? (
        <p className="mb-4 rounded-2xl bg-calm p-4 text-sm text-fg">
          Automatic alerts aren&apos;t set up on this BLOOM server yet, so SOS will open a ready-written text to these contacts instead. The server admin can turn alerts on by adding VAPID keys.
        </p>
      ) : null}
      {contacts.length === 0 ? (
        <EmptyState
          title="No trusted contacts yet"
          body="Add up to 8 people you'd want to hear from you in an emergency — a sister, a friend, a roommate."
          action={
            <Button onClick={() => setAdding(true)}>
              <UserRoundPlus aria-hidden /> Add a contact
            </Button>
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-line">
            {contacts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <span aria-hidden className={cn("grid size-11 shrink-0 place-items-center rounded-full font-display text-lg font-bold", c.status === "accepted" ? "bg-accent text-accent-fg" : "bg-accent-soft text-heading")}>
                  {c.name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-heading">
                    {c.name}
                    {c.relationship ? <span className="font-normal text-muted"> · {c.relationship}</span> : null}
                  </p>
                  <p className={cn("text-sm", c.status === "accepted" && c.devices > 0 ? "text-leaf dark:text-petal" : "text-muted")}>{statusText(c)}</p>
                </div>
                <div className="flex gap-1">
                  {c.status !== "accepted" ? (
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() =>
                        start(async () => {
                          const res = await newInviteLink(c.id);
                          if (res.ok) setInvite({ name: c.name, phone: c.phone, url: res.inviteUrl });
                          else toast(res.error, "error");
                        })
                      }
                    >
                      Send invite
                    </Button>
                  ) : null}
                  <Button asChild size="icon" variant="ghost" aria-label={`Call ${c.name}`}>
                    <a href={telLink(c.phone)}>
                      <Phone aria-hidden />
                    </a>
                  </Button>
                  {confirming === c.id ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        start(async () => {
                          await removeTrustedContact(c.id);
                          setConfirming(null);
                          toast(`Removed ${c.name}`);
                        })
                      }
                    >
                      Remove {c.name}?
                    </Button>
                  ) : (
                    <Button size="icon" variant="ghost" aria-label={`Remove ${c.name}`} onClick={() => setConfirming(c.id)}>
                      <Trash2 aria-hidden />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {contacts.length < 8 ? (
            <Button variant="secondary" className="mt-3" onClick={() => setAdding(true)}>
              <UserRoundPlus aria-hidden /> Add a contact
            </Button>
          ) : null}
        </>
      )}

      <Sheet
        open={adding || Boolean(invite)}
        onOpenChange={(o) => {
          if (!o) {
            setAdding(false);
            setInvite(null);
            setError(null);
          }
        }}
        title={invite ? `Invite ${invite.name}` : "Add a trusted contact"}
        description={invite ? undefined : "They'll get an invite. Nothing is sent to them until they accept."}
      >
        {invite ? (
          <InviteShare name={invite.name} phone={invite.phone} userName={userName} url={invite.url} />
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <InputField label="Name" required maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <InputField label="Phone number" type="tel" required autoComplete="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} hint="Used for the text and call buttons on your SOS screen." />
            <InputField label="Relationship (optional)" maxLength={30} placeholder="Sister, friend, roommate…" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
            {error ? (
              <p role="alert" className="rounded-2xl bg-sos-bg/10 px-4 py-3 text-sm font-semibold text-sos-bg">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" disabled={pending || !form.name.trim() || !form.phone.trim()}>
              {pending ? "Adding…" : "Add and create invite"}
            </Button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
