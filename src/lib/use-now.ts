"use client";
import { useSyncExternalStore } from "react";

let now = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

function subscribe(onTick: () => void) {
  listeners.add(onTick);
  if (timer === undefined) {
    now = Date.now();
    timer = window.setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(onTick);
    if (listeners.size === 0) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

/** A clock that ticks every second. `null` during server rendering and hydration. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, () => (now ||= Date.now()), () => null);
}
