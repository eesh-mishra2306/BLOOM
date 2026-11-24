import type { MochiEvent } from "@/lib/events";

/** How Mochi feels right now. Drives the 3D rig's face, ears, tail and bounce. */
export type Expression = "idle" | "happy" | "curious" | "sleepy" | "asleep" | "comforting" | "listening" | "thinking" | "talking";

export interface MochiState {
  expression: Expression;
  /** Temporary moods fall back to idle (or comforting) on "timeout". */
  transient: boolean;
  /** Incremented to trigger a hop. */
  bounce: number;
  /** Set when a message sounded worrying; Mochi stays gentle until the next turn. */
  concerned: boolean;
  /** True while a chat turn is in flight, so Mochi doesn't fall asleep mid-conversation. */
  chatting: boolean;
  /** Hidden during emergencies. */
  hidden: boolean;
}

export type MochiAction = MochiEvent | "timeout" | "emergency-start" | "emergency-end";

export const INITIAL_MOCHI: MochiState = {
  expression: "idle",
  transient: false,
  bounce: 0,
  concerned: false,
  chatting: false,
  hidden: false,
};

const rest = (s: MochiState): Expression => (s.concerned ? "comforting" : "idle");

export function mochiReducer(state: MochiState, action: MochiAction): MochiState {
  if (action === "emergency-start") return { ...state, hidden: true };
  if (action === "emergency-end") return { ...INITIAL_MOCHI, bounce: state.bounce };
  if (state.hidden) return state;

  switch (action) {
    case "tap":
    case "pet":
    case "greet":
    case "log-saved":
    case "breath-done":
      return { ...state, expression: "happy", transient: true, bounce: state.bounce + 1 };
    case "wake":
      return state.expression === "asleep" || state.expression === "sleepy" ? { ...state, expression: "curious", transient: true } : state;
    case "idle":
      if (state.chatting) return state;
      if (state.expression === "sleepy") return { ...state, expression: "asleep", transient: false };
      if (state.expression === "asleep") return state;
      return { ...state, expression: "sleepy", transient: false };
    case "chat-sent":
      return { ...state, expression: "thinking", transient: false, concerned: false, chatting: true };
    case "chat-streaming":
      return { ...state, expression: state.concerned ? "comforting" : "talking", transient: false, chatting: true };
    case "chat-done":
      return state.concerned
        ? { ...state, expression: "comforting", transient: false, chatting: false }
        : { ...state, expression: "happy", transient: true, chatting: false };
    case "concern":
      return { ...state, expression: "comforting", transient: false, concerned: true };
    case "timeout":
      return state.transient ? { ...state, expression: rest(state), transient: false } : state;
  }
  return state;
}
