import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, streamText, toUIMessageStream } from "ai";
import { z } from "zod";
import { cycleContextFor } from "@/lib/ai/context";
import { listMemories } from "@/lib/ai/memory";
import { buildInstructions } from "@/lib/ai/prompt";
import { getChatModel } from "@/lib/ai/provider";
import { retrieve } from "@/lib/ai/retrieve";
import { resourcesFor, triage, TRIAGE_HEADLINE } from "@/lib/ai/triage";
import type { BloomUIMessage } from "@/lib/ai/types";
import { apiUser } from "@/lib/auth/session";
import { getConsents } from "@/lib/consent";
import { isCrossSite, problem, readJson } from "@/lib/http";
import { ensureProfile } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const MAX_HISTORY = 20;

const textPart = z.object({ type: z.literal("text"), text: z.string() });
const messageSchema = z.object({
  id: z.string().max(100),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.looseObject({ type: z.string() })).max(40),
});
const bodySchema = z.object({ messages: z.array(messageSchema).min(1).max(60) });

export async function POST(req: Request) {
  if (isCrossSite(req)) return problem(403, "cross_site", "This request came from another site.");
  const user = await apiUser(req);
  if (!user) return problem(401, "unauthenticated", "Sign in to chat with Mochi.");

  const limit = await rateLimit(`chat:${user.id}`, 30, 600);
  if (!limit.ok) {
    return problem(429, "rate_limited", `That's a lot of messages in a short time. Mochi can chat again in about ${Math.ceil(limit.retryAfter / 60)} min.`, {
      retryAfter: limit.retryAfter,
    });
  }

  const parsed = await readJson(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  // Keep only text from recent history; data parts (safety cards, sources) never go back to the model.
  const history = parsed.data.messages.slice(-MAX_HISTORY).map((m) => ({
    id: m.id,
    role: m.role,
    parts: m.parts.flatMap((p) => {
      const t = textPart.safeParse(p);
      return t.success ? [{ type: "text" as const, text: t.data.text }] : [];
    }),
  }));
  const last = history[history.length - 1];
  const latest = last?.role === "user" ? last.parts.map((p) => p.text).join("\n").trim() : "";
  if (!latest) return problem(422, "invalid_request", "Send a message for Mochi to reply to.");
  if (history.some((m) => m.role === "user" && m.parts.some((p) => p.text.length > 2000))) {
    return problem(422, "message_too_long", "Messages can be up to 2,000 characters.");
  }

  const consents = await getConsents(user.id);
  if (!consents.ai_chat) {
    return problem(403, "consent_required", "Turn on “Chat with Mochi using an AI service” in Privacy to talk with Mochi.");
  }

  const profile = await ensureProfile(user.id);
  const safety = triage(latest);
  const previousUser = [...history].reverse().slice(1).find((m) => m.role === "user");
  const references = retrieve([latest, previousUser?.parts.map((p) => p.text).join(" ") ?? ""].join(" "));
  const chat = getChatModel();

  const stream = createUIMessageStream<BloomUIMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      if (safety.level !== "none") {
        writer.write({
          type: "data-safety",
          id: "safety",
          data: { level: safety.level, headline: TRIAGE_HEADLINE[safety.level], resources: resourcesFor(safety.level, profile.country) },
        });
      }
      if (!chat) {
        writer.write({
          type: "data-notice",
          id: "notice",
          data: {
            code: "ai_not_configured",
            message: "Mochi's AI isn't connected on this server yet, so Mochi can't reply. Safety help and every other part of BLOOM still work.",
          },
        });
        writer.write({ type: "finish" });
        return;
      }
      if (references.length) {
        writer.write({
          type: "data-sources",
          id: "sources",
          data: {
            items: references.map((r) => ({ id: r.id, title: r.title, publisher: r.sources[0].publisher, url: r.sources[0].url })),
          },
        });
      }
      const [cycle, memories] = await Promise.all([
        consents.ai_cycle_context ? cycleContextFor(user.id, profile) : undefined,
        consents.ai_memory ? listMemories(user.id).then((ms) => ms.map((m) => m.text)) : undefined,
      ]);
      const instructions = buildInstructions({
        userName: profile.displayName || user.name,
        companionName: profile.companionName,
        species: profile.companionSpecies,
        personality: profile.companionPersonality,
        language: profile.companionLanguage,
        references,
        triage: safety,
        cycle,
        memories,
      });
      const result = streamText({
        model: chat.model,
        instructions,
        messages: await convertToModelMessages(history),
        maxOutputTokens: 700,
        temperature: 0.7,
        abortSignal: req.signal,
      });
      writer.merge(toUIMessageStream({ stream: result.stream, sendStart: false }));
    },
    onError: (error) => {
      console.error("mochi chat failed", error instanceof Error ? error.message : error);
      return "Mochi couldn't reply just now. Try again in a moment.";
    },
  });

  return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "no-store" } });
}
