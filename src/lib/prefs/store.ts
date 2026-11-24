"use client";
import { create } from "zustand";
import { PREFS_STORAGE_KEY } from "./bootstrap";
import { DEFAULT_PREFS, type Prefs } from "./model";

export function readStoredPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
    return {
      ...DEFAULT_PREFS,
      ...stored,
      ambient: { ...DEFAULT_PREFS.ambient, ...(stored.ambient ?? {}) },
      lock: { ...DEFAULT_PREFS.lock, ...(stored.lock ?? {}) },
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

type PrefsState = Prefs & { hydrated: boolean; update: (patch: Partial<Prefs>) => void };

export const usePrefs = create<PrefsState>()((set, get) => ({
  ...DEFAULT_PREFS,
  hydrated: false,
  update: (patch) => {
    set(patch);
    const { hydrated: _h, update: _u, ...prefs } = get();
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Private browsing can refuse storage; the choice still applies for this visit.
    }
  },
}));

/** PBKDF2-SHA-256 hash for the device app-lock PIN. */
export async function hashPin(pin: string, saltB64?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 210_000 }, material, 256);
  const toB64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
  return { hash: toB64(bits), salt: toB64(salt) };
}
