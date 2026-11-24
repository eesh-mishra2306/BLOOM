"use client";
import { useEffect } from "react";
import { onBloom } from "@/lib/events";
import { useMochi } from "./store";

const SLEEPY_AFTER = 45_000;
const ASLEEP_AFTER = 100_000;

/** Feeds app events into Mochi and lets Mochi doze when nothing happens for a while. */
export function useMochiBus() {
  const dispatch = useMochi((s) => s.dispatch);

  useEffect(() => {
    const off = onBloom((e) => {
      if (e.type === "mochi") dispatch(e.event);
      else if (e.type === "emergency-start" || e.type === "emergency-end") dispatch(e.type);
      else if (e.type === "activity") dispatch(e.kind === "breathing" ? "breath-done" : "log-saved");
    });

    let last = Date.now();
    let level = 0;
    const active = () => {
      last = Date.now();
      if (level > 0) {
        level = 0;
        dispatch("wake");
      }
    };
    const timer = window.setInterval(() => {
      const quiet = Date.now() - last;
      if (level === 0 && quiet > SLEEPY_AFTER) {
        level = 1;
        dispatch("idle");
      } else if (level === 1 && quiet > ASLEEP_AFTER) {
        level = 2;
        dispatch("idle");
      }
    }, 5_000);
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const ev of events) window.addEventListener(ev, active, { passive: true });

    return () => {
      off();
      window.clearInterval(timer);
      for (const ev of events) window.removeEventListener(ev, active);
    };
  }, [dispatch]);
}
