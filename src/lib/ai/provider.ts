import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { getEnv } from "@/lib/env";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";

/**
 * The language model for Mochi, chosen by AI_PROVIDER / AI_MODEL. Returns null when the
 * provider isn't fully configured — callers must say so instead of faking a reply.
 * Keys never leave the server.
 */
export function getChatModel(): { model: LanguageModel; label: string } | null {
  const env = getEnv();
  const provider =
    env.AI_PROVIDER ?? (env.ANTHROPIC_API_KEY ? "anthropic" : env.OPENAI_API_KEY ? "openai" : env.GOOGLE_GENERATIVE_AI_API_KEY ? "google" : undefined);
  switch (provider) {
    case "anthropic": {
      if (!env.ANTHROPIC_API_KEY) return null;
      const id = env.AI_MODEL ?? DEFAULT_ANTHROPIC_MODEL;
      return { model: createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(id), label: `Anthropic ${id}` };
    }
    case "openai": {
      if (!env.OPENAI_API_KEY || !env.AI_MODEL) return null;
      return { model: createOpenAI({ apiKey: env.OPENAI_API_KEY })(env.AI_MODEL), label: `OpenAI ${env.AI_MODEL}` };
    }
    case "google": {
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY || !env.AI_MODEL) return null;
      return { model: createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY })(env.AI_MODEL), label: `Google ${env.AI_MODEL}` };
    }
    default:
      return null;
  }
}

export function aiProviderName(): string | null {
  const env = getEnv();
  return env.AI_PROVIDER ?? null;
}

const PRIVACY_URLS: Record<string, string> = {
  Anthropic: "https://www.anthropic.com/legal/privacy",
  OpenAI: "https://openai.com/policies/privacy-policy/",
  Google: "https://policies.google.com/privacy",
};

/** What the privacy centre tells people about where Mochi's messages go. */
export function aiProviderInfo(): { label: string; company: string; privacyUrl: string } | null {
  const chat = getChatModel();
  if (!chat) return null;
  const company = chat.label.split(" ")[0];
  return { label: chat.label, company, privacyUrl: PRIVACY_URLS[company] ?? "" };
}
