"use client";
import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { BloomUIMessage } from "@/lib/ai/types";
import { emitBloom } from "@/lib/events";

/**
 * One conversation shared by the corner dock and the /companion page, kept in memory only.
 * Reloading the page starts fresh; BLOOM never stores chat transcripts.
 */
export const mochiChat = new Chat<BloomUIMessage>({
  transport: new DefaultChatTransport({ api: "/api/companion/chat" }),
  onData: (part) => {
    if (part.type === "data-safety") emitBloom({ type: "mochi", event: "concern" });
  },
  onFinish: () => emitBloom({ type: "mochi", event: "chat-done" }),
  onError: () => emitBloom({ type: "mochi", event: "chat-done" }),
});

/** Turns a transport error into the API's error code and message, when there is one. */
export function readChatError(error: Error | undefined): { code: string; message: string } | null {
  if (!error) return null;
  try {
    const parsed = JSON.parse(error.message) as { error?: { code?: string; message?: string } };
    if (parsed.error?.code) return { code: parsed.error.code, message: parsed.error.message ?? "" };
  } catch {}
  if (/fetch|network|Failed to/i.test(error.message)) {
    return { code: "offline", message: "BLOOM couldn't reach the server. Check your connection and try again." };
  }
  return { code: "unknown", message: "Mochi couldn't reply just now. Try again in a moment." };
}
