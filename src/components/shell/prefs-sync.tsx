"use client";
import { useEffect } from "react";
import { PREFS_STORAGE_KEY } from "@/lib/prefs/bootstrap";
import { resolveAttributes } from "@/lib/prefs/model";
import { readStoredPrefs, usePrefs } from "@/lib/prefs/store";

/** Keeps <html data-*> in step with saved preferences, the OS settings and other tabs. */
export function PrefsSync() {
  useEffect(() => {
    usePrefs.setState({ ...readStoredPrefs(), hydrated: true });

    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;

    const apply = () => {
      const attrs = resolveAttributes(usePrefs.getState(), { prefersDark: dark.matches, prefersReducedMotion: reduced.matches });
      root.dataset.theme = attrs.theme;
      root.dataset.discreet = String(attrs.discreet);
      root.dataset.motion = attrs.motion;
      root.dataset.contrast = attrs.contrast;
      root.style.setProperty("--text-scale", String(attrs.textScale));
      if (attrs.discreet && document.title !== "Daybook") document.title = "Daybook";
    };
    apply();

    const unsubscribe = usePrefs.subscribe(apply);
    dark.addEventListener("change", apply);
    reduced.addEventListener("change", apply);
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREFS_STORAGE_KEY) usePrefs.setState(readStoredPrefs());
    };
    window.addEventListener("storage", onStorage);
    // Page titles change on navigation; keep the neutral title while discreet.
    const titleObserver = new MutationObserver(() => {
      if (usePrefs.getState().discreet && document.title !== "Daybook") document.title = "Daybook";
    });
    titleObserver.observe(document.head, { subtree: true, childList: true, characterData: true });

    return () => {
      unsubscribe();
      dark.removeEventListener("change", apply);
      reduced.removeEventListener("change", apply);
      window.removeEventListener("storage", onStorage);
      titleObserver.disconnect();
    };
  }, []);
  return null;
}
