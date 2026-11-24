"use client";
import { useEffect } from "react";
import { EMERGENCY_CARD_KEY, type EmergencyCard } from "@/lib/safety/emergency-card";
import { usePrefs } from "@/lib/prefs/store";

/** Keeps the offline SOS page's copy of contacts and emergency info up to date (or removes it). */
export function EmergencyCardSync({ card }: { card: Omit<EmergencyCard, "v" | "updatedAt"> }) {
  const hydrated = usePrefs((s) => s.hydrated);
  const keep = usePrefs((s) => s.offlineCard);
  const serialized = JSON.stringify(card);
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (keep) localStorage.setItem(EMERGENCY_CARD_KEY, JSON.stringify({ v: 1, ...JSON.parse(serialized), updatedAt: Date.now() }));
      else localStorage.removeItem(EMERGENCY_CARD_KEY);
    } catch {}
  }, [hydrated, keep, serialized]);
  return null;
}
