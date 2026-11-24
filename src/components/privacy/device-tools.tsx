"use client";
import { Bell, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EMERGENCY_CARD_KEY } from "@/lib/safety/emergency-card";
import { PREFS_STORAGE_KEY } from "@/lib/prefs/bootstrap";

type Perm = "granted" | "denied" | "prompt" | "unsupported" | "checking";
const WORDS: Record<Perm, string> = {
  granted: "Allowed",
  denied: "Blocked",
  prompt: "Not asked yet",
  unsupported: "Not available in this browser",
  checking: "Checking…",
};

/** What this browser lets BLOOM do, and what each permission is used for. */
export function PermissionAudit() {
  const [geo, setGeo] = useState<Perm>("checking");
  const [notify, setNotify] = useState<Perm>("checking");
  useEffect(() => {
    let alive = true;
    const set = (fn: (p: Perm) => void, p: Perm) => alive && fn(p);
    if (!navigator.permissions) set(setGeo, "unsupported");
    else
      navigator.permissions
        .query({ name: "geolocation" })
        .then((s) => set(setGeo, s.state as Perm))
        .catch(() => set(setGeo, "unsupported"));
    Promise.resolve().then(() => set(setNotify, "Notification" in window ? (Notification.permission === "default" ? "prompt" : (Notification.permission as Perm)) : "unsupported"));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <ul className="space-y-2">
      <li className="flex items-start gap-3 rounded-2xl bg-surface-strong p-3">
        <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-pink-ink" />
        <span>
          <span className="font-semibold text-heading">Location: {WORDS[geo]}</span>
          <span className="block text-sm text-muted">Used only for an SOS you send and for journeys you share, if you turned those on above.</span>
        </span>
      </li>
      <li className="flex items-start gap-3 rounded-2xl bg-surface-strong p-3">
        <Bell aria-hidden className="mt-0.5 size-5 shrink-0 text-pink-ink" />
        <span>
          <span className="font-semibold text-heading">Notifications: {WORDS[notify]}</span>
          <span className="block text-sm text-muted">Used for journey check-in reminders, and for alerts if someone added you to their trusted circle.</span>
        </span>
      </li>
      <li className="text-sm text-muted">To change these, open your browser&apos;s site settings for BLOOM.</li>
    </ul>
  );
}

/** Removes what BLOOM keeps in this browser. The account itself is untouched. */
export function ClearThisDevice() {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <div className="space-y-2 rounded-2xl bg-accent-soft p-4">
      <p className="font-semibold text-heading">Clear BLOOM from this browser?</p>
      <p className="text-sm text-fg">This removes your display settings, the PIN lock and the offline emergency card on this device. Your account and everything saved in it stay.</p>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            try {
              localStorage.removeItem(PREFS_STORAGE_KEY);
              localStorage.removeItem(EMERGENCY_CARD_KEY);
              sessionStorage.clear();
            } catch {
              /* storage blocked */
            }
            window.location.reload();
          }}
        >
          Clear this browser
        </Button>
      </div>
    </div>
  ) : (
    <Button variant="secondary" onClick={() => setConfirm(true)}>
      Clear BLOOM from this browser
    </Button>
  );
}
