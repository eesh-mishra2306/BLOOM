"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MochiFlat } from "@/components/mochi/mochi-flat";
import { useReducedMotion } from "@/lib/prefs/use-reduced-motion";

const MochiCanvas = dynamic(() => import("@/components/mochi/mochi-canvas").then((m) => m.MochiCanvas), {
  ssr: false,
  loading: () => <MochiFlat mood="happy" className="size-full" />,
});

/** Mochi waves hello on the landing page. */
export function HeroMochi() {
  const reduced = useReducedMotion();
  const [wave, setWave] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => setWave(1), 900);
    return () => window.clearTimeout(t);
  }, [reduced]);
  return (
    <button type="button" onClick={() => setWave((w) => w + 1)} className="block size-full cursor-pointer rounded-full" aria-label="Mochi, BLOOM's companion. Tap to say hi.">
      <MochiCanvas species="kitten" color="cream" accessory="flower" expression="happy" bounce={wave} wave={wave} fps={reduced ? 0 : 30} label="Mochi, a small cream kitten with a pink flower, waving" className="size-full" />
    </button>
  );
}
