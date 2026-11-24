"use client";
import { BellRing, CheckCircle2, Clock, MapPin, Plus, TimerOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { ProgressRing } from "@/components/ui/progress-ring";
import { toast } from "@/components/ui/toast";
import { currentSubscription, pushSupported, subscribeThisDevice } from "@/lib/push-client";
import { clock, countdown, duration, reach, type CircleMember, type ClientJourney } from "@/lib/safety/journey-client";
import type { Fix } from "@/lib/safety/links";
import { useClientValue } from "@/lib/use-client-value";
import { useNow } from "@/lib/use-now";
import { ShareButtons } from "./share-buttons";

type Props = { initial: ClientJourney; shareUrl: string; circle: CircleMember[]; timeZone: string; vapidKey: string | null; timerOn: boolean };
type Action = { action: "check_in" } | { action: "arrive" } | { action: "end" } | { action: "extend"; minutes: number };

const names = (list: string[]) => (list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`);

export function JourneyLive({ initial, shareUrl, circle, timeZone, vapidKey, timerOn: timerOnAtLoad }: Props) {
  const router = useRouter();
  const now = useNow();
  const [j, setJ] = useState(initial);
  const [timerOn, setTimerOn] = useState(timerOnAtLoad);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [location, setLocation] = useState<{ state: "waiting" | "on" | "denied" | "unavailable"; fix?: Fix }>({ state: "waiting" });

  const people = circle.filter((c) => j.contactIds.includes(c.id));
  const started = Date.parse(j.startedAt);
  const eta = Date.parse(j.expectedArrivalAt);
  const due = Date.parse(j.nextCheckInDueAt);
  const alertAt = due + j.graceMinutes * 60_000;
  const isDue = now !== null && now >= due;
  const escalated = j.status === "escalated";
  const first = (people.map((p) => p.name)[0] ?? "your contacts").split(" ")[0];

  async function act(body: Action, label: string) {
    setBusy(label);
    try {
      const res = await fetch(`/api/journey/${j.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.message ?? "That didn't go through. Check your connection and try again.", "error");
        if (res.status === 404) router.refresh();
        return;
      }
      if (body.action === "arrive") {
        const sent = (data.deliveries as { contactName: string; status: string }[]).filter((d) => d.status === "sent").map((d) => d.contactName);
        toast(sent.length ? `Glad you're there. ${names(sent)} got the message.` : "Glad you're there. Let your people know yourself — BLOOM couldn't alert anyone automatically.", "success");
        router.refresh();
      } else if (body.action === "end") {
        toast("Journey ended");
        router.refresh();
      } else {
        setJ(data.journey);
        toast(escalated ? `Checked in. ${first} has been told.` : body.action === "extend" ? `Added ${body.minutes} minutes` : "Checked in", "success");
      }
    } finally {
      setBusy(null);
    }
  }

  // A buzz when a check-in falls due, once per check-in.
  const buzzedFor = useRef(0);
  useEffect(() => {
    if (isDue && buzzedFor.current !== due) {
      buzzedFor.current = due;
      navigator.vibrate?.([250, 120, 250]);
    }
  }, [isDue, due]);

  // Stay in sync with the server: the every-minute check may have alerted contacts, and its timer may have started or stopped.
  useEffect(() => {
    const id = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const res = await fetch(`/api/journey/${j.id}`).catch(() => null);
      if (!res?.ok) return;
      const { journey, timerOn: on } = (await res.json()) as { journey: ClientJourney; timerOn?: boolean };
      if (typeof on === "boolean") setTimerOn(on);
      if (journey.status === "arrived" || journey.status === "ended") router.refresh();
      else setJ(journey);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [j.id, router]);

  // Location, about once a minute, only while this page is open.
  useEffect(() => {
    if (!j.shareLocation || !("geolocation" in navigator)) return;
    let lastSent = 0;
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const fix: Fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy), at: Date.now() };
        setLocation({ state: "on", fix });
        if (Date.now() - lastSent < 60_000) return;
        lastSent = Date.now();
        void fetch(`/api/journey/${j.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "location", location: fix }) }).catch(() => undefined);
      },
      (err) => setLocation({ state: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [j.id, j.shareLocation]);

  const shareText = `I'm on my way to ${j.destination}. I should get there by ${clock(eta, timeZone)}. You can follow along here: ${shareUrl}`;
  const total = Math.max(1, eta - started);

  return (
    <div className="space-y-5">
      <div>
        <p className="font-semibold text-muted">On the way to</p>
        <h1 className="text-4xl break-words">{j.destination}</h1>
      </div>

      {timerOn ? null : (
        <p className="flex items-start gap-2 rounded-2xl bg-accent-soft p-4 text-heading">
          <TimerOff aria-hidden className="mt-0.5 size-5 shrink-0" />
          <span>
            <strong>Keep BLOOM open on your screen.</strong> Its automatic timer is off right now, so it can&apos;t remind you or alert your people
            while it&apos;s closed or your screen is off.
          </span>
        </p>
      )}

      {isDue ? (
        <section role="alert" className={escalated ? "emergency-surface rounded-[var(--radius-card)] p-5 sm:p-6" : "glass rounded-[var(--radius-card)] p-5 sm:p-6"}>
          <h2 className={escalated ? "text-3xl text-sos-fg" : "text-3xl"}>{escalated ? `${first} was alerted` : "Are you okay?"}</h2>
          <p className={escalated ? "mt-1 text-sos-fg" : "mt-1 text-fg"}>
            {escalated
              ? `You missed a check-in, so BLOOM alerted ${names(people.map((p) => p.name))} at ${clock(j.escalatedAt ?? alertAt, timeZone)}. Check in to let them know.`
              : `Check in now. If you don't by ${clock(alertAt, timeZone)}, BLOOM will alert ${names(people.map((p) => p.name))}.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="lg" variant={escalated ? "secondary" : "primary"} disabled={!!busy} onClick={() => act({ action: "check_in" }, "check_in")}>
              <CheckCircle2 aria-hidden /> {busy === "check_in" ? "Checking in…" : "I'm okay"}
            </Button>
            <Button size="lg" variant="secondary" disabled={!!busy} onClick={() => act({ action: "arrive" }, "arrive")}>
              I&apos;ve arrived
            </Button>
          </div>
        </section>
      ) : null}

      <Glass tier={1} petal className="space-y-5">
        <div className="flex flex-wrap items-center gap-5">
          <ProgressRing value={now ? (now - started) / total : 0} size={148} stroke={12} label="How far through the journey you are">
            <span className="text-center">
              <span className="block font-display text-3xl text-heading tabular-nums">{now ? countdown(Math.max(0, eta - now)) : "–"}</span>
              <span className="text-sm text-muted">{now && now > eta ? "past arrival time" : "to arrival"}</span>
            </span>
          </ProgressRing>
          <dl className="grid gap-2 text-fg">
            <div>
              <dt className="text-sm text-muted">Arriving by</dt>
              <dd className="font-display text-2xl text-heading">{clock(eta, timeZone)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Next check-in</dt>
              <dd className="flex items-center gap-1.5 font-semibold text-heading">
                <Clock aria-hidden className="size-4" /> {clock(due, timeZone)}
                {now && !isDue ? <span className="font-normal text-muted">(in {duration(due - now)})</span> : null}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" disabled={!!busy} onClick={() => act({ action: "arrive" }, "arrive")}>
            <CheckCircle2 aria-hidden /> {busy === "arrive" ? "Telling them…" : "I've arrived"}
          </Button>
          <Button variant="secondary" disabled={!!busy} onClick={() => act({ action: "extend", minutes: 10 }, "extend")}>
            <Plus aria-hidden /> 10 min
          </Button>
          {!isDue ? (
            <Button variant="secondary" disabled={!!busy} onClick={() => act({ action: "check_in" }, "check_in")}>
              I&apos;m okay
            </Button>
          ) : null}
        </div>
      </Glass>

      <Glass tier={2} className="space-y-4">
        <h2 className="text-2xl">Following along</h2>
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-3 rounded-2xl bg-surface-strong p-3">
              <span>
                <span className="font-semibold text-heading">{p.name}</span>
                <span className="block text-sm text-muted">
                  {reach(p) === "alerts" ? "Gets alerts on their phone" : reach(p) === "send_link" ? "Alerts are off — send them the link" : "Hasn't accepted yet — send them the link"}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          <p className="font-semibold text-heading">Send the follow-along link</p>
          <input readOnly value={shareUrl} aria-label="Follow-along link" onFocus={(e) => e.currentTarget.select()} className="h-11 w-full rounded-[var(--radius-field)] border border-line bg-surface-strong px-3 text-sm text-fg" />
          <ShareButtons text={shareText} phones={people.map((p) => p.phone)} title="My journey" copied="Link copied" />
          <p className="text-sm text-muted">Anyone with this link can see this journey until an hour after it ends.</p>
        </div>
      </Glass>

      <Glass tier={2} className="space-y-4">
        <div className="flex items-start gap-3">
          <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-pink-ink" />
          <p className="text-fg">
            {!j.shareLocation
              ? "You're not sharing your location on this journey."
              : location.state === "on" && location.fix
                ? `Sharing your location while this page is open (accurate to about ${location.fix.accuracy} m).`
                : location.state === "denied"
                  ? "Location is blocked for BLOOM in your browser settings, so it isn't being shared."
                  : location.state === "unavailable"
                    ? "Can't get your location right now. Your people still see your check-ins."
                    : "Finding your location…"}
          </p>
        </div>
        <Reminders vapidKey={vapidKey} timerOn={timerOn} />
      </Glass>

      {confirmEnd ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-2xl bg-accent-soft p-4">
          <p className="mr-auto font-semibold text-heading">End without arriving? Your people won&apos;t be told you arrived.</p>
          <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
            Keep going
          </Button>
          <Button variant="danger" disabled={!!busy} onClick={() => act({ action: "end" }, "end")}>
            End journey
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setConfirmEnd(true)}>
            End journey without arriving
          </Button>
          <Link href="/sos" className="font-semibold text-sos-bg underline underline-offset-4">
            Need help now? Open SOS
          </Link>
        </div>
      )}
    </div>
  );
}

function Reminders({ vapidKey, timerOn }: { vapidKey: string | null; timerOn: boolean }) {
  const supported = useClientValue(() => pushSupported(), false);
  const [state, setState] = useState<"checking" | "on" | "off" | "busy">("checking");

  useEffect(() => {
    if (!supported || !vapidKey) return;
    let alive = true;
    void currentSubscription().then(async (sub) => {
      if (!alive) return;
      if (!sub) return setState("off");
      // Make sure this browser is registered to this account (it may have been someone else's).
      await fetch("/api/devices", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) }).catch(() => undefined);
      if (alive) setState("on");
    });
    return () => {
      alive = false;
    };
  }, [supported, vapidKey]);

  if (!vapidKey) return <p className="text-sm text-muted">Check-in reminders on your phone aren&apos;t set up on this BLOOM server yet. Keep this page open so you see when a check-in is due.</p>;
  if (!supported) return <p className="text-sm text-muted">This browser can&apos;t show reminders. On iPhone, add BLOOM to your Home Screen first. Until then, keep this page open.</p>;
  if (state === "on")
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-heading">
        <BellRing aria-hidden className="size-4 text-pink-ink" /> Check-in reminders are on for this phone.
      </p>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        {timerOn ? "Get a reminder on this phone when a check-in is due, even with BLOOM closed." : "Get a reminder on this phone when a check-in is due."}
      </p>
      <Button
        variant="secondary"
        disabled={state === "busy" || state === "checking"}
        onClick={async () => {
          setState("busy");
          try {
            const subscription = await subscribeThisDevice(vapidKey);
            const res = await fetch("/api/devices", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription }) });
            if (!res.ok) throw new Error("Couldn't save this phone for reminders. Try again.");
            setState("on");
          } catch (err) {
            toast(err instanceof Error ? err.message : "Couldn't turn on reminders.", "error");
            setState("off");
          }
        }}
      >
        <BellRing aria-hidden /> Turn on reminders
      </Button>
    </div>
  );
}
