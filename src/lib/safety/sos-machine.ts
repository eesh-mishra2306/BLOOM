/**
 * The SOS screen's state. Pure, so it can be tested and so the screen never depends on
 * anything but this reducer and plain links to decide what to show.
 */
export type DispatchStatus = "pending" | "sent" | "partial" | "failed" | "offline" | "not_configured" | "no_contacts" | "no_devices";

export type SosState =
  | { phase: "idle" }
  | { phase: "arming"; endsAt: number }
  | { phase: "active"; startedAt: number; dispatch: DispatchStatus; eventId?: string }
  | { phase: "resolved"; at: number };

export type SosAction =
  | { type: "press"; now: number; countdown: number }
  | { type: "tick"; now: number }
  | { type: "cancel" }
  | { type: "dispatched"; eventId: string; outcome: Exclude<DispatchStatus, "pending" | "offline" | "failed"> | "failed" }
  | { type: "dispatch-failed"; offline: boolean }
  | { type: "resolve"; now: number }
  | { type: "reset" };

export function sosReducer(state: SosState, action: SosAction): SosState {
  switch (action.type) {
    case "press":
      if (state.phase !== "idle") return state;
      return action.countdown <= 0
        ? { phase: "active", startedAt: action.now, dispatch: "pending" }
        : { phase: "arming", endsAt: action.now + action.countdown * 1000 };
    case "tick":
      return state.phase === "arming" && action.now >= state.endsAt ? { phase: "active", startedAt: state.endsAt, dispatch: "pending" } : state;
    case "cancel":
      return state.phase === "arming" ? { phase: "idle" } : state;
    case "dispatched":
      return state.phase === "active" ? { ...state, dispatch: action.outcome, eventId: action.eventId } : state;
    case "dispatch-failed":
      return state.phase === "active" ? { ...state, dispatch: action.offline ? "offline" : "failed" } : state;
    case "resolve":
      return state.phase === "active" ? { phase: "resolved", at: action.now } : state;
    case "reset":
      return { phase: "idle" };
  }
}

/**
 * Whole seconds left on the SOS countdown. Never more than the countdown itself (the screen's
 * clock may have been read just before the press) and never zero while it is still arming.
 */
export function countdownLeft(endsAt: number, now: number, total: number): number {
  return Math.min(Math.max(1, total), Math.max(1, Math.ceil((endsAt - now) / 1000)));
}
