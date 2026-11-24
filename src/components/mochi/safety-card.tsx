import { Phone, Siren, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Resource } from "@/lib/ai/triage";
import { cn } from "@/lib/utils";

/** Shown above Mochi's reply when a message sounds urgent. Works without the AI. */
export function SafetyCard({ headline, resources, className }: { headline: string; resources: Resource[]; className?: string }) {
  return (
    <section aria-label={headline} className={cn("emergency-surface rounded-2xl border-2 border-sos-bg/70 bg-surface-strong p-4", className)}>
      <p className="font-display text-lg font-semibold text-heading">{headline}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {resources.map((r) => {
          const external = r.href.startsWith("http");
          const inner = (
            <>
              {r.href === "/sos" ? <Siren aria-hidden className="size-5 shrink-0" /> : external ? <ExternalLink aria-hidden className="size-5 shrink-0" /> : <Phone aria-hidden className="size-5 shrink-0" />}
              <span className="min-w-0">
                <span className="block font-bold">{r.label}</span>
                {r.detail ? <span className="block text-sm font-medium opacity-85">{r.detail}</span> : null}
              </span>
            </>
          );
          const cls = cn(
            "flex min-h-14 items-center gap-3 rounded-2xl px-4 py-2 text-left",
            r.href.startsWith("tel:") ? "bg-sos-bg text-sos-fg" : "bg-accent-soft text-heading",
          );
          return (
            <li key={r.href}>
              {r.href.startsWith("/") ? (
                <Link href={r.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <a href={r.href} className={cls} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  {inner}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
