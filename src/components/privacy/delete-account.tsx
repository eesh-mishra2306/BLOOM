"use client";
import { useState, useTransition } from "react";
import { deleteMyAccount } from "@/app/(app)/privacy/actions";
import { Button } from "@/components/ui/button";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
    );

  return (
    <form
      className="space-y-3 rounded-2xl border border-sos-bg/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await deleteMyAccount(password);
          if (res && !res.ok) setError(res.error);
        });
      }}
    >
      <p className="font-semibold text-heading">This deletes everything: cycle logs, journal, moods, Mochi&apos;s notes, your trusted circle and your safety history. It can&apos;t be undone.</p>
      <p className="text-sm text-fg">Your encryption key is destroyed first, so even backup copies can&apos;t be read. Download your data first if you want a copy. Your trusted contacts aren&apos;t told.</p>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-heading">Your password</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 w-full rounded-[var(--radius-field)] border border-line bg-surface-strong px-3 text-fg"
        />
      </label>
      <label className="flex items-start gap-2 text-sm text-fg">
        <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5 size-4 accent-[var(--sos-bg)]" />I understand my account and data will be gone for good.
      </label>
      {error ? (
        <p role="alert" className="font-semibold text-sos-bg">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Keep my account
        </Button>
        <Button type="submit" variant="danger" disabled={!understood || !password || pending}>
          {pending ? "Deleting…" : "Delete forever"}
        </Button>
      </div>
    </form>
  );
}
