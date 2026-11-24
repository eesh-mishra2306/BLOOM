"use client";
import { useSyncExternalStore } from "react";
import { usePrefs } from "./store";

const QUERY = "(prefers-reduced-motion: reduce)";
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True when the person chose reduced motion in BLOOM, or left it on "system" and their device asks for it. */
export function useReducedMotion(): boolean {
  const motion = usePrefs((s) => s.motion);
  const system = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  return motion === "reduced" || (motion === "system" && system);
}
