"use client";
import { LockKeyhole, Siren } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { useClientValue } from "@/lib/use-client-value";
import { hashPin, usePrefs } from "@/lib/prefs/store";

const UNLOCKED_KEY = "bloom.unlockedAt";

/**
 * Device PIN lock. Keeps casual eyes out on a shared phone; it is not protection against
 * someone who knows the phone's passcode or can inspect the browser. Emergency stays reachable.
 */
export function AppLock() {
  const hydrated = usePrefs((s) => s.hydrated);
  const lock = usePrefs((s) => s.lock);
  // The inline bootstrap marks <html data-locked> before first paint when the lock is due.
  const lockedAtLoad = useClientValue(() => document.documentElement.dataset.locked === "1", false);
  const [lockedNow, setLockedNow] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const lastActive = useRef(0);
  const active = hydrated && lock.enabled && Boolean(lock.pinHash && lock.salt);
  const locked = active && (lockedNow ?? lockedAtLoad);

  useEffect(() => {
    const root = document.documentElement;
    if (!active) {
      delete root.dataset.locked;
      return;
    }
    lastActive.current = Date.now();
    const lockNow = () => {
      root.dataset.locked = "1";
      setLockedNow(true);
    };

    const touch = () => {
      lastActive.current = Date.now();
      sessionStorage.setItem(UNLOCKED_KEY, String(Date.now()));
    };
    const check = () => {
      if (Date.now() - lastActive.current > lock.timeoutMin * 60_000) lockNow();
    };
    const id = window.setInterval(check, 15_000);
    window.addEventListener("pointerdown", touch, { passive: true });
    window.addEventListener("keydown", touch);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      document.removeEventListener("visibilitychange", check);
    };
  }, [active, lock.timeoutMin]);

  const unlock = useCallback(async () => {
    if (!lock.salt || !lock.pinHash) return;
    const { hash } = await hashPin(pin, lock.salt);
    if (hash === lock.pinHash) {
      sessionStorage.setItem(UNLOCKED_KEY, String(Date.now()));
      lastActive.current = Date.now();
      delete document.documentElement.dataset.locked;
      setLockedNow(false);
      setPin("");
      setError(null);
    } else {
      setError("That PIN didn't match. Try again.");
      setPin("");
    }
  }, [lock.pinHash, lock.salt, pin]);

  async function forgot() {
    usePrefs.getState().update({ lock: { enabled: false, timeoutMin: lock.timeoutMin } });
    await authClient.signOut();
    window.location.replace("/auth");
  }

  if (!locked) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="lock-title" className="fixed inset-0 z-[100] grid place-items-center bg-bg px-6">
      <div className="w-full max-w-sm text-center">
        <LockKeyhole aria-hidden className="mx-auto size-10 text-accent" />
        <h1 id="lock-title" className="mt-3 text-3xl">
          Enter your PIN
        </h1>
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void unlock();
          }}
        >
          <label htmlFor="lock-pin" className="sr-only">
            PIN
          </label>
          <input
            id="lock-pin"
            autoFocus
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? "lock-error" : undefined}
            className="h-16 rounded-2xl border border-line bg-surface-strong text-center font-display text-3xl tracking-[0.5em] text-heading"
          />
          {error ? (
            <p id="lock-error" role="alert" className="text-sm font-semibold text-sos-bg">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={pin.length < 4}>
            Unlock
          </Button>
        </form>
        <Button asChild variant="danger" size="lg" className="mt-8 w-full">
          <Link href="/sos">
            <Siren aria-hidden />
            <span className="discreet:hidden">Emergency SOS</span>
            <span className="hidden discreet:inline">Help</span>
          </Link>
        </Button>
        <button type="button" onClick={forgot} className="mt-4 text-sm font-semibold text-muted underline underline-offset-4">
          Forgot your PIN? Sign out and sign back in
        </button>
      </div>
    </div>
  );
}
