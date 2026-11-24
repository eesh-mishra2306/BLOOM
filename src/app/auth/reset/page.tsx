"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { Glass } from "@/components/ui/glass";
import { authClient } from "@/lib/auth/client";

function ResetForm() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return <p className="text-muted">This reset link is missing its code. Open the link from your email again, or ask for a new one.</p>;
  }
  if (state === "done") {
    return (
      <div className="space-y-4">
        <p className="text-lg text-heading">Your password is changed. You&apos;re signed out on other devices.</p>
        <Button asChild>
          <Link href="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setError(null);
        const { error } = await authClient.resetPassword({ newPassword: password, token });
        if (error) {
          setError(error.code === "PASSWORD_TOO_SHORT" ? "Use at least 10 characters." : "This link has expired or was already used. Ask for a new one.");
          setState("idle");
        } else setState("done");
      }}
    >
      <InputField label="New password" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 10 characters." error={error} />
      <Button type="submit" size="lg" disabled={state === "busy" || password.length < 10}>
        Save new password
      </Button>
    </form>
  );
}

export default function ResetPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-5">
      <Glass tier={1} petal className="w-full p-8">
        <h1 className="mb-4 text-3xl">Choose a new password</h1>
        <Suspense>
          <ResetForm />
        </Suspense>
      </Glass>
    </main>
  );
}
