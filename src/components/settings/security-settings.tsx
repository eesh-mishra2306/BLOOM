"use client";
import { Fingerprint, KeyRound, LogOut, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth/client";

type Passkey = { id: string; name?: string | null; createdAt: Date | string };

export function SecuritySettings() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [pending, start] = useTransition();

  async function refresh() {
    const res = await authClient.passkey.listUserPasskeys();
    setPasskeys((res.data as Passkey[] | null) ?? []);
  }
  useEffect(() => {
    let alive = true;
    void authClient.passkey.listUserPasskeys().then((res) => alive && setPasskeys((res.data as Passkey[] | null) ?? []));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
            if (res.error) return toast(res.error.message ?? "Couldn't change your password.", "error");
            setCurrent("");
            setNext("");
            toast("Password changed. You've been signed out everywhere else.", "success");
          });
        }}
      >
        <h3 className="flex items-center gap-2 text-xl">
          <KeyRound aria-hidden className="size-5 text-pink-ink" /> Password
        </h3>
        <InputField label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        <InputField label="New password" type="password" autoComplete="new-password" minLength={10} value={next} onChange={(e) => setNext(e.target.value)} hint="At least 10 characters. A short sentence works well." required />
        <Button type="submit" variant="secondary" disabled={pending || !current || next.length < 10}>
          Change password
        </Button>
      </form>

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-xl">
          <Fingerprint aria-hidden className="size-5 text-pink-ink" /> Passkeys
        </h3>
        <p className="text-fg">Sign in with your fingerprint, face or screen lock instead of typing a password.</p>
        {passkeys === null ? (
          <p className="text-muted">Loading…</p>
        ) : passkeys.length ? (
          <ul className="space-y-2">
            {passkeys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-strong p-3">
                <span>
                  <span className="font-semibold text-heading">{k.name || "Passkey"}</span>
                  <span className="block text-xs text-muted">Added {new Date(k.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${k.name || "passkey"}`}
                  className="grid size-10 place-items-center rounded-full text-muted hover:bg-accent-soft"
                  onClick={() =>
                    start(async () => {
                      await authClient.passkey.deletePasskey({ id: k.id });
                      await refresh();
                    })
                  }
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No passkeys yet.</p>
        )}
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await authClient.passkey.addPasskey({ name: `${navigator.platform || "This device"} passkey` });
              if (res?.error) return toast(res.error.message ?? "Couldn't add a passkey on this device.", "error");
              toast("Passkey added", "success");
              await refresh();
            })
          }
        >
          Add a passkey on this device
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-xl">
          <LogOut aria-hidden className="size-5 text-pink-ink" /> Other devices
        </h3>
        <p className="text-fg">Lost a phone, or signed in somewhere you shouldn&apos;t have? Sign out everywhere except here.</p>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await authClient.revokeOtherSessions();
              toast(res.error ? "Couldn't sign out other devices." : "Signed out of every other device.", res.error ? "error" : "success");
            })
          }
        >
          Sign out other devices
        </Button>
      </div>
    </div>
  );
}
