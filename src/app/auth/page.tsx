import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MochiFlat } from "@/components/mochi/mochi-flat";
import { Wordmark } from "@/components/shell/wordmark";
import { getSessionUser } from "@/lib/auth/session";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Sign in" };

function safeNext(next: string | string[] | undefined): string | null {
  const value = Array.isArray(next) ? next[0] : next;
  // Only same-site paths, never protocol-relative URLs.
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const mode = params.mode === "create" ? "create" : "signin";
  if (await getSessionUser()) redirect(next ?? "/dashboard");

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-16 lg:px-10">
      <section className="max-w-xl">
        <Wordmark />
        <div className="mt-6 flex items-end gap-3 lg:mt-10 lg:gap-4">
          <MochiFlat className="size-20 shrink-0 sm:size-28 lg:size-36" mood="happy" />
          <p className="glass petal-flip mb-4 px-4 py-2.5 text-heading sm:mb-6 sm:px-5 sm:py-3 sm:text-lg">Hi! I&apos;m Mochi. I&apos;ll keep you company.</p>
        </div>
        <h1 className="mt-6 text-3xl sm:text-4xl lg:mt-8 lg:text-5xl">Your cycle, your calm, and your way home.</h1>
        <p className="mt-3 max-w-md text-muted sm:mt-4 sm:text-lg">
          Track your period with honest predictions, talk things through with Mochi, and keep your trusted people one tap away.
        </p>
      </section>
      <section aria-label={mode === "create" ? "Create account" : "Sign in"}>
        <AuthForm next={next} initialMode={mode} />
        <p className="mt-6 text-center text-sm text-muted">
          In danger right now?{" "}
          <a href="tel:112" className="font-bold text-sos-bg underline underline-offset-4">
            Call 112
          </a>{" "}
          or{" "}
          <a href="/sos" className="font-bold text-heading underline underline-offset-4">
            open SOS
          </a>
          .
        </p>
      </section>
    </main>
  );
}
