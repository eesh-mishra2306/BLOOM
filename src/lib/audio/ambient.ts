"use client";
import { useSyncExternalStore } from "react";
import { onBloom } from "@/lib/events";
import { createAmbientEngine, type AmbientEngine, type AmbientState } from "./ambient-engine";
import { renderSoundscape } from "./soundscapes";

let engine: AmbientEngine | null = null;

/** The one ambient engine for this tab; it keeps playing across page changes. */
export function getAmbient(): AmbientEngine {
  engine ??= createAmbientEngine({
    createContext: () => new AudioContext({ latencyHint: "playback" }),
    render: renderSoundscape,
    onEmergency: (cb) => onBloom((e) => e.type === "emergency-start" && cb()),
  });
  return engine;
}

const SERVER: AmbientState = { kind: null, playing: false, loading: false, volume: 0.5, pausedForEmergency: false };

export function useAmbient(): AmbientState {
  return useSyncExternalStore(
    (l) => getAmbient().subscribe(l),
    () => getAmbient().getState(),
    () => SERVER,
  );
}

export const audioSupported = () => typeof window !== "undefined" && "AudioContext" in window && "OfflineAudioContext" in window;
