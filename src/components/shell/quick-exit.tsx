"use client";
import { EyeOff } from "lucide-react";
import { useEffect } from "react";
import { usePrefs } from "@/lib/prefs/store";
import { cn } from "@/lib/utils";

/** Hides the page immediately and replaces this history entry with a neutral site. */
export function quickExit(url: string) {
  document.documentElement.dataset.exiting = "true";
  try {
    sessionStorage.clear();
  } catch {}
  window.location.replace(url);
}

export function QuickExitButton({ className }: { className?: string }) {
  const url = usePrefs((s) => s.quickExitUrl);

  useEffect(() => {
    let presses: number[] = [];
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const now = Date.now();
      presses = [...presses.filter((t) => now - t < 900), now];
      if (presses.length >= 3) quickExit(usePrefs.getState().quickExitUrl);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <button
      type="button"
      onClick={() => quickExit(url)}
      aria-label="Quick exit"
      title="Quick exit (or press Escape three times)"
      className={cn("inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-semibold text-heading hover:bg-accent-soft", className)}
    >
      <EyeOff aria-hidden className="size-5" />
      <span aria-hidden>Exit</span>
    </button>
  );
}
