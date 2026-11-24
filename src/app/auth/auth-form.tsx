"use client";
import { Eye, EyeOff, Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { Glass } from "@/components/ui/glass";
import { Segmented } from "@/components/ui/segmented";
import { authClient } from "@/lib/auth/client";

type Mode = "signin" | "create" | "forgot";

function explain(error: { code?: string; status?: number; message?: string } | null | undefined): string {
  if (!error) return "Something went wrong. Try again.";
  if (error.status === 429) return "Too many attempts. Wait a minute, then try again.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match. Check them and try again.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "There's already an account with this email. Sign in instead.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 10 characters for your password.";
    case "PASSWORD_TOO_LONG":
      return "Use 128 characters or fewer for your password.";
    case "INVALID_EMAIL":
      return "Enter an email address like asha@example.com.";
    default:
      return error.message ?? "Something went wrong. Try again.";
  }
}

export function AuthForm({ next, initialMode }: { next: string | null; initialMode: "signin" | "create" }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adult, setAdult] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) return setError(explain(error));
        router.replace(next ?? "/dashboard");
        router.refresh();
      } else if (mode === "create") {
        if (!adult) return setError("BLOOM is for people aged 18 and over for now.");
        const { error } = await authClient.signUp.email({ email, password, name: name.trim() || "Friend" });
        if (error) return setError(explain(error));
        router.replace("/onboarding");
        router.refresh();
      } else {
        const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/auth/reset" });
        if (error) {
          return setError(
            error.status === 500
              ? "Password reset email isn't set up on this server yet. Ask the BLOOM team to reset it for you."
              : explain(error),
          );
        }
        setNotice("If there's an account for that email, a reset link is on its way. It expires in an hour.");
      }
    } catch {
      setError("BLOOM couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function passkey() {
    setError(null);
    const res = await authClient.signIn.passkey();
    if (res?.error) return setError("That passkey didn't work. Try your password instead.");
    router.replace(next ?? "/dashboard");
    router.refresh();
  }

  return (
    <Glass tier={1} petal className="p-6 sm:p-8">
      {mode !== "forgot" ? (
        <Segmented
          label="Choose"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
          options={[
            { value: "signin", label: "Sign in" },
            { value: "create", label: "Create account" },
          ]}
          className="mb-6 w-full [&>button]:flex-1"
        />
      ) : (
        <h2 className="mb-4 text-2xl">Reset your password</h2>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {mode === "create" ? (
          <InputField label="Your first name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        ) : null}
        <InputField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== "forgot" ? (
          <div className="relative">
            <InputField
              label="Password"
              type={show ? "text" : "password"}
              autoComplete={mode === "create" ? "new-password" : "current-password"}
              required
              minLength={mode === "create" ? 10 : undefined}
              hint={mode === "create" ? "At least 10 characters. A short sentence works well." : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-1.5 top-[2.15rem] grid size-10 place-items-center rounded-full text-muted hover:bg-accent-soft"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
            </button>
          </div>
        ) : null}
        {mode === "create" ? (
          <label className="flex items-start gap-3 text-sm text-fg">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 size-5 accent-[var(--accent)]" />
            <span>I&apos;m 18 or older. I&apos;ve read how BLOOM handles my data on the Privacy page.</span>
          </label>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-2xl bg-sos-bg/10 px-4 py-3 text-sm font-semibold text-sos-bg">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-2xl bg-accent-soft px-4 py-3 text-sm font-semibold text-heading">
            {notice}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "create" ? "Create account" : "Send reset link"}
        </Button>
      </form>

      {mode === "signin" ? (
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="secondary" onClick={passkey}>
            <Fingerprint aria-hidden /> Sign in with a passkey
          </Button>
          <button type="button" onClick={() => setMode("forgot")} className="mt-1 text-sm font-semibold text-muted underline underline-offset-4">
            Forgot your password?
          </button>
        </div>
      ) : mode === "forgot" ? (
        <button type="button" onClick={() => setMode("signin")} className="mt-4 text-sm font-semibold text-muted underline underline-offset-4">
          Back to sign in
        </button>
      ) : null}
    </Glass>
  );
}
