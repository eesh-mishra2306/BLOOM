import { cn } from "@/lib/utils";

/** Five soft petals around a blush centre — BLOOM's mark. */
export function BloomGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <defs>
        <linearGradient id="glyph-petal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb8d0" />
          <stop offset="100%" stopColor="#ff4f91" />
        </linearGradient>
      </defs>
      {[0, 72, 144, 216, 288].map((deg) => (
        <path
          key={deg}
          transform={`rotate(${deg} 16 16)`}
          d="M16 15.5c-3.6-1.6-5.2-5.3-3.9-8.7.6-1.6 1.9-2.6 3.1-3l.8 1.7.8-1.7c1.2.4 2.5 1.4 3.1 3 1.3 3.4-.3 7.1-3.9 8.7Z"
          fill="url(#glyph-petal)"
        />
      ))}
      <circle cx="16" cy="16" r="2.6" fill="#fff0f5" stroke="#e83f65" strokeWidth="0.8" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-flex items-center gap-1.5 discreet:hidden">
        <BloomGlyph />
        <span className="font-display text-[1.65rem] leading-none font-bold tracking-[-0.03em] text-heading">bloom</span>
      </span>
      <span className="hidden text-xl font-semibold text-heading discreet:inline">Daybook</span>
    </span>
  );
}
