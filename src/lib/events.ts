/** Tiny in-page event bus so far-apart components can react without shared state. */

export type MochiEvent =
  | "tap"
  | "pet"
  | "greet"
  | "log-saved"
  | "breath-done"
  | "chat-sent"
  | "chat-streaming"
  | "chat-done"
  | "concern"
  | "idle"
  | "wake";

export type BloomEvent =
  | { type: "emergency-start" }
  | { type: "emergency-end" }
  | { type: "mochi"; event: MochiEvent }
  | { type: "activity"; kind: "breathing" | "mood" | "journal" | "cycle_log" | "goal" };

const NAME = "bloom";

export function emitBloom(event: BloomEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<BloomEvent>(NAME, { detail: event }));
}

export function onBloom(handler: (event: BloomEvent) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<BloomEvent>).detail);
  window.addEventListener(NAME, listener);
  return () => window.removeEventListener(NAME, listener);
}
