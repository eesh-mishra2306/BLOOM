"use client";
import { BellRing, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { keyBytes } from "@/lib/push-client";
import { useClientValue } from "@/lib/use-client-value";

type Props = { token: string; inviterName: string; contactName: string; initialStatus: string; initialDevices: number; vapidKey: string | null };

export function InviteResponse({ token, inviterName, contactName, initialStatus, initialDevices, vapidKey }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [devices, setDevices] = useState(initialDevices);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const iosNeedsInstall = useClientValue(
    () =>
      /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
      !(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true),
    false,
  );
  const first = inviterName.split(" ")[0];

  async function post(body: object) {
    const res = await fetch(`/api/safety/invite/${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = res.headers.get("content-type")?.includes("json") ? await res.json() : {};
    if (!res.ok) throw new Error(data?.error?.message ?? "That didn't work. Try again.");
    return data;
  }

  async function respond(accept: boolean) {
    setBusy(true);
    setNote(null);
    try {
      await post({ action: accept ? "accept" : "decline" });
      setStatus(accept ? "accepted" : "declined");
    } catch (e) {
      setNote({ tone: "warn", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function enableAlerts() {
    setNote(null);
    if (!vapidKey) return setNote({ tone: "warn", text: `Alerts aren't set up on this BLOOM server yet. ${first}'s SOS screen can still text you.` });
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setNote({
        tone: "warn",
        text: iosNeedsInstall
          ? "On iPhone, add this page to your Home Screen first (Share, then Add to Home Screen), open it from there, and tap this button again."
          : "This browser can't receive alerts. Try Chrome, Edge, Firefox or Samsung Internet.",
      });
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNote({ tone: "warn", text: "Notifications are blocked for this site. Allow them in your browser settings, then try again." });
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) }));
      await post({ action: "subscribe", subscription: sub.toJSON() });
      setDevices((d) => Math.max(1, d + (devices === 0 ? 1 : 0)));
      setNote({ tone: "ok", text: `Alerts are on for this device. If ${first} sends an SOS, you'll get a notification here.` });
    } catch (e) {
      setNote({ tone: "warn", text: (e as Error).message || "Couldn't turn on alerts on this device." });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setNote(null);
    try {
      const data = await post({ action: "test" });
      setNote(
        data.status === "sent"
          ? { tone: "ok", text: "Test alert sent. It should appear on this device in a few seconds." }
          : { tone: "warn", text: "The test alert couldn't be delivered. Try turning alerts on again." },
      );
    } catch (e) {
      setNote({ tone: "warn", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Glass tier={1} petal className="space-y-5">
      <div>
        <h1 className="text-3xl">
          {first} added you as a trusted contact{contactName ? `, ${contactName.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-2 text-fg">
          If {first} sends an SOS from BLOOM, or misses a check-in on a journey, you can get an alert on this device with where they are, if they choose to share it. BLOOM won&apos;t message you for anything else.
        </p>
      </div>

      {status === "pending" || status === "declined" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" className="flex-1" disabled={busy} onClick={() => respond(true)}>
            Accept
          </Button>
          <Button size="lg" variant="ghost" disabled={busy} onClick={() => respond(false)}>
            {status === "declined" ? "You declined" : "No thanks"}
          </Button>
        </div>
      ) : null}

      {status === "accepted" ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 font-semibold text-heading">
            <CheckCircle2 aria-hidden className="size-5 text-leaf dark:text-petal" /> You&apos;re in {first}&apos;s trusted circle.
          </p>
          {iosNeedsInstall ? (
            <p className="rounded-2xl bg-calm p-4 text-sm text-fg">On iPhone, alerts only work after you add this page to your Home Screen (Share, then Add to Home Screen) and open it from there.</p>
          ) : null}
          <Button size="lg" className="w-full" disabled={busy} onClick={enableAlerts}>
            <BellRing aria-hidden /> {devices > 0 ? "Turn on alerts on this device too" : "Turn on alerts on this device"}
          </Button>
          {devices > 0 ? (
            <Button variant="secondary" className="w-full" disabled={busy} onClick={test}>
              Send me a test alert
            </Button>
          ) : null}
        </div>
      ) : null}

      {note ? (
        <p role="status" className={note.tone === "ok" ? "rounded-2xl bg-accent-soft p-4 text-sm font-semibold text-heading" : "rounded-2xl bg-sos-bg/10 p-4 text-sm font-semibold text-sos-bg"}>
          {note.text}
        </p>
      ) : null}
      <p className="text-xs text-muted">Keep this link: you can open it again to turn on alerts on another device. {first} can remove you at any time.</p>
    </Glass>
  );
}
