import { Siren } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Always visible. Opens the emergency screen; the countdown there lets you cancel. */
export function SosLink({ className }: { className?: string }) {
  return (
    <Link
      href="/sos?go=1"
      prefetch
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-full bg-sos-bg px-4 font-bold text-sos-fg shadow-[0_8px_20px_-8px_rgb(200_16_46/0.7)] transition-transform active:scale-95 discreet:shadow-none",
        className,
      )}
    >
      <Siren aria-hidden className="size-5 discreet:hidden" />
      <span className="discreet:hidden">SOS</span>
      <span className="hidden discreet:inline">Help</span>
    </Link>
  );
}
