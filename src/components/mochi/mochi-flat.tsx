import { cn } from "@/lib/utils";
import { furFor, type Species } from "./palette";

type MochiFlatProps = { species?: Species; color?: string; mood?: "idle" | "happy" | "asleep"; className?: string; title?: string };

/**
 * Flat drawing of the companion. Used where 3D isn't available (no WebGL, very low-end
 * devices) and in places where a live canvas would be wasteful.
 */
export function MochiFlat({ species = "kitten", color = "cream", mood = "idle", className, title }: MochiFlatProps) {
  const c = furFor(color);
  const eyesClosed = mood === "asleep";
  return (
    <svg viewBox="0 0 120 120" className={cn("size-24", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <style>{`@keyframes mochi-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}.mochi-eye{transform-box:fill-box;transform-origin:center;animation:mochi-blink 5.2s infinite}`}</style>
      <ellipse cx="60" cy="108" rx="30" ry="5" fill="#66263f" opacity=".1" />
      {/* ears */}
      {species === "kitten" && (
        <>
          <path d="M28 46 L32 14 L54 34 Z" fill={c.fur} stroke={c.shade} strokeWidth="2" strokeLinejoin="round" />
          <path d="M92 46 L88 14 L66 34 Z" fill={c.fur} stroke={c.shade} strokeWidth="2" strokeLinejoin="round" />
          <path d="M33 38 L35 22 L47 33 Z" fill={c.inner} />
          <path d="M87 38 L85 22 L73 33 Z" fill={c.inner} />
        </>
      )}
      {species === "bunny" && (
        <>
          <ellipse cx="44" cy="20" rx="9" ry="22" fill={c.fur} stroke={c.shade} strokeWidth="2" transform="rotate(-10 44 20)" />
          <ellipse cx="76" cy="20" rx="9" ry="22" fill={c.fur} stroke={c.shade} strokeWidth="2" transform="rotate(10 76 20)" />
          <ellipse cx="44" cy="22" rx="4" ry="15" fill={c.inner} transform="rotate(-10 44 22)" />
          <ellipse cx="76" cy="22" rx="4" ry="15" fill={c.inner} transform="rotate(10 76 22)" />
        </>
      )}
      {species === "bear" && (
        <>
          <circle cx="32" cy="30" r="12" fill={c.fur} stroke={c.shade} strokeWidth="2" />
          <circle cx="88" cy="30" r="12" fill={c.fur} stroke={c.shade} strokeWidth="2" />
          <circle cx="32" cy="30" r="6" fill={c.inner} />
          <circle cx="88" cy="30" r="6" fill={c.inner} />
        </>
      )}
      {/* head */}
      <ellipse cx="60" cy="64" rx="40" ry="36" fill={c.fur} stroke={c.shade} strokeWidth="2" />
      {species === "puppy" && (
        <>
          <ellipse cx="22" cy="58" rx="10" ry="20" fill={c.shade} transform="rotate(18 22 58)" />
          <ellipse cx="98" cy="58" rx="10" ry="20" fill={c.shade} transform="rotate(-18 98 58)" />
        </>
      )}
      {/* cheeks */}
      <ellipse cx="34" cy="76" rx="8" ry="5" fill="#ff8fb4" opacity={mood === "happy" ? 0.7 : 0.45} />
      <ellipse cx="86" cy="76" rx="8" ry="5" fill="#ff8fb4" opacity={mood === "happy" ? 0.7 : 0.45} />
      {/* eyes */}
      {eyesClosed ? (
        <>
          <path d="M38 64 q7 6 14 0" stroke="#3a1626" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M68 64 q7 6 14 0" stroke="#3a1626" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : mood === "happy" ? (
        <>
          <path d="M38 66 q7 -8 14 0" stroke="#3a1626" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M68 66 q7 -8 14 0" stroke="#3a1626" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <g className="mochi-eye">
            <ellipse cx="45" cy="64" rx="7" ry="8.5" fill="#3a1626" />
            <circle cx="47.5" cy="60.5" r="2.6" fill="#fff" />
          </g>
          <g className="mochi-eye">
            <ellipse cx="75" cy="64" rx="7" ry="8.5" fill="#3a1626" />
            <circle cx="77.5" cy="60.5" r="2.6" fill="#fff" />
          </g>
        </>
      )}
      {/* nose + mouth */}
      <path d="M56.5 74 h7 l-3.5 4 z" fill="#e83f65" strokeLinejoin="round" />
      <path d="M53 80 q3.5 4 7 0 q3.5 4 7 0" stroke="#3a1626" strokeWidth="2" fill="none" strokeLinecap="round" />
      {species === "kitten" && (
        <g stroke={c.shade} strokeWidth="1.6" strokeLinecap="round">
          <path d="M20 72 l12 2" />
          <path d="M20 80 l12 -1" />
          <path d="M100 72 l-12 2" />
          <path d="M100 80 l-12 -1" />
        </g>
      )}
    </svg>
  );
}
