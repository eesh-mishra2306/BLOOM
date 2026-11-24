"use client";
import { MapPin, MessageSquareText, Phone, Share2, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { emitBloom } from "@/lib/events";
import { useClientValue } from "@/lib/use-client-value";
import { detectPlatform, mapsLink, smsLink, sosMessage, telLink, type Fix } from "@/lib/safety/links";
import { countdownLeft, sosReducer, type DispatchStatus } from "@/lib/safety/sos-machine";
import { cn } from "@/lib/utils";

type Delivery = { contactId: string; contactName: string; status: string; acknowledged: boolean };

export type SosScreenProps = {
  signedIn: boolean;
  name: string;
  emergency: string;
  extras: { label: string; number: string }[];
  countdown: number;
  customMessage: string | null;
  contacts: { name: string; phone: string }[];
  info: Record<string, string | undefined> | null;
  locationAllowed: boolean;
  autoStart: boolean;
};

const INFO_LABELS: Record<string, string> = { bloodGroup: "Blood group", allergies: "Allergies", medications: "Medicines", conditions: "Conditions", notes: "Notes" };

function deliveryText(d: Delivery): string {
  if (d.acknowledged) return `${d.contactName} is responding`;
  switch (d.status) {
    case "delivered":
      return `Reached ${d.contactName}'s phone`;
    case "sent":
      return `Sent to ${d.contactName}, waiting for their phone to confirm`;
    case "no_device":
      return `${d.contactName} hasn't turned on alerts yet. Text them below.`;
    case "invite_pending":
      return `${d.contactName} hasn't accepted your invite yet. Text them below.`;
    case "declined":
      return `${d.contactName} declined alerts. Text or call them below.`;
    case "not_configured":
      return `Couldn't alert ${d.contactName} automatically. Text them below.`;
    default:
      return `Couldn't reach ${d.contactName}'s phone. Text them below.`;
  }
}

const HEADLINE: Record<DispatchStatus, string> = {
  pending: "Alerting your trusted contacts…",
  sent: "Your trusted contacts are being alerted",
  partial: "Some contacts were alerted",
  failed: "BLOOM couldn't alert anyone automatically",
  offline: "You're offline, so no one was alerted automatically",
  not_configured: "Automatic alerts aren't set up yet",
  no_contacts: "You haven't added trusted contacts yet",
  no_devices: "Your contacts haven't turned on alerts yet",
};

export function SosScreen(props: SosScreenProps) {
  const [state, dispatch] = useReducer(sosReducer, { phase: "idle" });
  const [now, setNow] = useState(() => Date.now());
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [fix, setFix] = useState<Fix | null>(null);
  const [locState, setLocState] = useState<"off" | "finding" | "shared" | "error" | "blocked">(props.locationAllowed ? "finding" : "off");
  const platform = useClientValue(() => detectPlatform(navigator.userAgent), "other");
  const eventId = state.phase === "active" ? state.eventId : undefined;
  const started = useRef(false);

  useEffect(() => {
    emitBloom({ type: "emergency-start" });
    return () => emitBloom({ type: "emergency-end" });
  }, []);

  useEffect(() => {
    if (props.autoStart && !started.current) {
      started.current = true;
      dispatch({ type: "press", now: Date.now(), countdown: props.countdown });
    }
  }, [props.autoStart, props.countdown]);

  // Countdown ticks
  useEffect(() => {
    if (state.phase !== "arming") return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: "tick", now: t });
    }, 200);
    return () => window.clearInterval(id);
  }, [state.phase]);

  const send = useCallback(async () => {
    if (!props.signedIn) return dispatch({ type: "dispatch-failed", offline: false });
    try {
      const res = await fetch("/api/safety/sos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location: null }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return dispatch({ type: "dispatch-failed", offline: false });
      const data = (await res.json()) as { eventId: string; deliveries: Delivery[] };
      setDeliveries(data.deliveries);
      const automatic = data.deliveries.filter((d) => d.status !== "invite_pending" && d.status !== "declined");
      const outcome: DispatchStatus =
        data.deliveries.length === 0
          ? "no_contacts"
          : automatic.length === 0
            ? "failed"
            : automatic.every((d) => d.status === "no_device")
              ? "no_devices"
              : automatic.every((d) => d.status === "not_configured")
              ? "not_configured"
              : automatic.every((d) => d.status === "sent")
                ? "sent"
                : automatic.some((d) => d.status === "sent")
                  ? "partial"
                  : "failed";
      dispatch({ type: "dispatched", eventId: data.eventId, outcome: outcome as "sent" });
    } catch {
      dispatch({ type: "dispatch-failed", offline: !navigator.onLine });
    }
  }, [props.signedIn]);

  // When SOS becomes active: buzz, alert contacts, and find location — all at once.
  useEffect(() => {
    if (state.phase !== "active" || state.dispatch !== "pending") return;
    navigator.vibrate?.([250, 100, 250]);
    // Signed out, send() records "couldn't alert" straight away. That extra render is intended:
    // SOS must start the moment it becomes active.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void send();
    if (props.locationAllowed && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
          setLocState("shared");
        },
        (err) => setLocState(err.code === 1 ? "blocked" : "error"),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // Share location with the alert once both exist
  useEffect(() => {
    if (!eventId || !fix) return;
    void fetch(`/api/safety/sos/${eventId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "location", location: fix }),
    }).catch(() => undefined);
  }, [eventId, fix]);

  // Follow delivery receipts and acknowledgements for a few minutes
  useEffect(() => {
    if (!eventId) return;
    let stopped = false;
    const until = Date.now() + 5 * 60_000;
    const poll = async () => {
      if (stopped || Date.now() > until) return;
      try {
        const res = await fetch(`/api/safety/sos/${eventId}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { deliveries: Delivery[] };
          setDeliveries((prev) => {
            const byId = new Map(data.deliveries.map((d) => [d.contactId, d]));
            return prev.map((p) => byId.get(p.contactId) ?? p);
          });
        }
      } catch {}
      if (!stopped) window.setTimeout(poll, 4000);
    };
    const t = window.setTimeout(poll, 3000);
    return () => {
      stopped = true;
      window.clearTimeout(t);
    };
  }, [eventId]);

  const message = useMemo(() => sosMessage({ name: props.name, location: fix, custom: props.customMessage }), [props.name, fix, props.customMessage]);
  const textHref = smsLink(props.contacts.map((c) => c.phone), message, platform);
  const textLabel = props.contacts.length ? `Text ${props.contacts.slice(0, 2).map((c) => c.name).join(" and ")}${props.contacts.length > 2 ? " and others" : ""}` : "Text someone";

  async function markSafe() {
    if (eventId) {
      await fetch(`/api/safety/sos/${eventId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "resolve" }) }).catch(() => undefined);
    }
    dispatch({ type: "resolve", now: Date.now() });
    emitBloom({ type: "emergency-end" });
  }

  const secondsLeft = state.phase === "arming" ? countdownLeft(state.endsAt, now, props.countdown) : 0;

  return (
    <main className="emergency-surface mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-5 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">
          <span className="discreet:hidden">Emergency</span>
          <span className="hidden discreet:inline">Help</span>
        </h1>
        <Link href={props.signedIn ? "/safety" : "/"} className="grid size-12 place-items-center rounded-full text-heading hover:bg-accent-soft" aria-label="Leave this screen">
          <X aria-hidden />
        </Link>
      </div>

      {state.phase === "arming" ? (
        <section aria-live="assertive" className="rounded-[1.75rem] bg-sos-bg p-6 text-center text-sos-fg">
          <p className="text-lg font-semibold">Alerting your trusted contacts in</p>
          <p className="font-display text-[6rem] leading-none text-sos-fg" aria-hidden>
            {secondsLeft}
          </p>
          <p className="sr-only">SOS will be sent in {secondsLeft} seconds. Press Cancel to stop it.</p>
          <button
            type="button"
            onClick={() => dispatch({ type: "cancel" })}
            className="mt-4 h-16 w-full rounded-2xl bg-white text-xl font-bold text-sos-bg"
          >
            Cancel
          </button>
        </section>
      ) : null}

      {state.phase === "idle" ? (
        <section className="space-y-3">
          {props.signedIn ? (
            <button
              type="button"
              onClick={() => dispatch({ type: "press", now: Date.now(), countdown: props.countdown })}
              className="flex h-40 w-full flex-col items-center justify-center rounded-[1.75rem] bg-sos-bg text-sos-fg shadow-[0_18px_40px_-16px_rgb(200_16_46/0.8)]"
            >
              <span className="font-display text-5xl text-sos-fg">SOS</span>
              <span className="mt-1 font-semibold">
                {props.countdown > 0 ? `Alerts your trusted contacts after a ${props.countdown}-second countdown` : "Alerts your trusted contacts immediately"}
              </span>
            </button>
          ) : (
            <p className="rounded-2xl bg-accent-soft p-4 text-heading">
              <Link href="/auth?next=/sos" className="font-bold underline underline-offset-4">
                Sign in
              </Link>{" "}
              so BLOOM can alert your trusted contacts. Calling and texting below work without an account.
            </p>
          )}
        </section>
      ) : null}

      {state.phase === "active" ? (
        <section aria-live="polite" className="rounded-[1.5rem] border-2 border-sos-bg/60 bg-surface-strong p-5">
          <p className="font-display text-2xl text-heading">{HEADLINE[state.dispatch]}</p>
          {state.dispatch === "offline" || state.dispatch === "failed" || state.dispatch === "not_configured" || state.dispatch === "no_devices" || state.dispatch === "no_contacts" ? (
            <p className="mt-1 text-fg">Use the buttons below. They work through your phone, even without internet.</p>
          ) : null}
          {deliveries.length ? (
            <ul className="mt-3 space-y-1.5">
              {deliveries.map((d) => (
                <li key={d.contactId} className="flex items-start gap-2 text-fg">
                  <span aria-hidden className={cn("mt-2 size-2.5 shrink-0 rounded-full", d.acknowledged || d.status === "delivered" ? "bg-leaf" : d.status === "sent" ? "bg-accent" : "bg-sos-bg")} />
                  <span>{deliveryText(d)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <MapPin aria-hidden className="size-4 shrink-0" />
            {locState === "shared" && fix
              ? `Sharing your location (accurate to about ${Math.round(fix.accuracy)} m).`
              : locState === "finding"
                ? "Finding your location…"
                : locState === "blocked"
                  ? "Location is blocked for BLOOM in your browser settings."
                  : locState === "error"
                    ? "Couldn't get your location. Your contacts won't see it."
                    : "Location sharing for SOS is off. Turn it on in Shield settings."}
          </p>
          {state.dispatch === "failed" || state.dispatch === "offline" ? (
            <button type="button" onClick={() => void send()} className="mt-3 h-12 rounded-full bg-accent-soft px-5 font-semibold text-heading">
              Try alerting again
            </button>
          ) : null}
        </section>
      ) : null}

      {state.phase === "resolved" ? (
        <section className="rounded-[1.5rem] bg-accent-soft p-5 text-heading">
          <p className="flex items-center gap-2 font-display text-2xl">
            <ShieldCheck aria-hidden /> You marked yourself safe
          </p>
          <p className="mt-1">Contacts who got your SOS are being told you&apos;re safe.</p>
          <Link href="/dashboard" className="mt-3 inline-flex h-12 items-center rounded-full bg-accent px-5 font-semibold text-accent-fg">
            Back to BLOOM
          </Link>
        </section>
      ) : null}

      {/* These never depend on the network, the server or any animation. */}
      <a href={telLink(props.emergency)} className="flex h-20 items-center justify-center gap-3 rounded-[1.5rem] bg-sos-bg text-2xl font-bold text-sos-fg">
        <Phone aria-hidden className="size-7" /> Call {props.emergency}
      </a>
      <a href={textHref} className="flex min-h-16 items-center justify-center gap-3 rounded-[1.5rem] bg-berry px-4 text-center text-xl font-bold text-cream dark:bg-petal dark:text-berry">
        <MessageSquareText aria-hidden className="size-6 shrink-0" /> {textLabel}
      </a>
      {fix ? (
        <button
          type="button"
          onClick={() => {
            const url = mapsLink(fix.lat, fix.lng);
            if (navigator.share) void navigator.share({ title: "My location", text: message, url }).catch(() => undefined);
            else void navigator.clipboard?.writeText(url);
          }}
          className="flex h-14 items-center justify-center gap-2 rounded-[1.25rem] bg-accent-soft font-semibold text-heading"
        >
          <Share2 aria-hidden className="size-5" /> Share my location another way
        </button>
      ) : null}
      {props.extras.map((x) => (
        <a key={x.number} href={telLink(x.number)} className="flex h-14 items-center justify-center gap-2 rounded-[1.25rem] bg-accent-soft font-semibold text-heading">
          <Phone aria-hidden className="size-5" /> {x.label}: {x.number}
        </a>
      ))}

      {props.info && Object.values(props.info).some(Boolean) ? (
        <section className="rounded-[1.25rem] border border-line bg-surface-strong p-4">
          <h2 className="text-lg">Emergency information</h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {Object.entries(INFO_LABELS).map(([k, label]) =>
              props.info?.[k] ? (
                <div key={k} className="contents">
                  <dt className="font-semibold text-heading">{label}</dt>
                  <dd className="text-fg">{props.info[k]}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </section>
      ) : null}

      {state.phase === "active" ? (
        <button type="button" onClick={markSafe} className="mt-2 h-14 rounded-full border-2 border-line font-semibold text-heading">
          I&apos;m safe now
        </button>
      ) : null}

      <p className="text-center text-sm text-muted">BLOOM alerts the people you trust. It doesn&apos;t contact the police or an ambulance for you.</p>
    </main>
  );
}
