import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuth } from "@/lib/auth/server";
import { setConsent } from "@/lib/consent";
import { upsertDayLog } from "@/lib/cycle/repo";
import { addDays, isoToday } from "@/lib/dates";
import { resetDb } from "./helpers";

const holder = vi.hoisted(() => ({ model: null as unknown, prompts: [] as unknown[] }));
vi.mock("@/lib/ai/provider", () => ({
  getChatModel: () => (holder.model ? { model: holder.model, label: "mock" } : null),
}));

const { POST } = await import("@/app/api/companion/chat/route");

function mockModel(text = "Hello from Mochi [S1]") {
  return new MockLanguageModelV4({
    doStream: async (options: { prompt: unknown }) => {
      holder.prompts.push(options.prompt);
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "t1" },
            { type: "text-delta", id: "t1", delta: text },
            { type: "text-end", id: "t1" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              logprobs: undefined,
              usage: { inputTokens: { total: 3, noCache: 3, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } },
            },
          ],
        }),
      };
    },
  } as never);
}

async function signedInUser() {
  const res = await getAuth().api.signUpEmail({
    body: { email: `chat-${crypto.randomUUID()}@example.com`, password: "a long enough password", name: "Asha" },
    asResponse: true,
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const body = await res.json();
  return { cookie, userId: body.user.id as string };
}

function chat(text: string, cookie?: string) {
  return POST(
    new Request("http://localhost:3000/api/companion/chat", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ messages: [{ id: "m1", role: "user", parts: [{ type: "text", text }] }] }),
    }),
  );
}

function systemText(prompt: unknown): string {
  const msgs = prompt as { role: string; content: unknown }[];
  return msgs
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join("\n");
}

describe("POST /api/companion/chat", () => {
  beforeEach(async () => {
    await resetDb();
    holder.model = null;
    holder.prompts = [];
  });

  it("refuses signed-out requests", async () => {
    const res = await chat("hi");
    expect(res.status).toBe(401);
  });

  it("asks for consent before sending anything to an AI provider", async () => {
    const { cookie } = await signedInUser();
    holder.model = mockModel();
    const res = await chat("hi", cookie);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("consent_required");
    expect(holder.prompts).toHaveLength(0);
  });

  it("still shows crisis help when no AI provider is configured", async () => {
    const { cookie, userId } = await signedInUser();
    await setConsent(userId, "ai_chat", true);
    const res = await chat("I want to kill myself", cookie);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('"type":"data-safety"');
    expect(body).toContain("14416");
    expect(body).toContain("ai_not_configured");
    expect(body).not.toContain('"type":"text-delta"');
  });

  it("streams the model's reply with matching reference notes", async () => {
    const { cookie, userId } = await signedInUser();
    await setConsent(userId, "ai_chat", true);
    holder.model = mockModel();
    const body = await (await chat("my cramps are really bad today", cookie)).text();
    expect(body).toContain("Hello from Mochi");
    expect(body).toContain('"type":"data-sources"');
    expect(body).toContain("period-pain");
    const system = systemText(holder.prompts[0]);
    expect(system).toContain("[S1] Easing period pain");
    expect(system).not.toContain("Cycle context");
  });

  it("shares a cycle summary only after the user allows it", async () => {
    const { cookie, userId } = await signedInUser();
    await setConsent(userId, "ai_chat", true);
    await upsertDayLog(userId, { date: addDays(isoToday("Asia/Kolkata"), -3), flow: "medium", cramps: 2, moods: [], symptoms: ["cramps"] });
    holder.model = mockModel();
    await (await chat("how am I doing", cookie)).text();
    expect(systemText(holder.prompts[0])).not.toContain("Cycle context");
    await setConsent(userId, "ai_cycle_context", true);
    await (await chat("how am I doing", cookie)).text();
    expect(systemText(holder.prompts[1])).toContain("Cycle context");
  });

  it("rejects messages over 2,000 characters", async () => {
    const { cookie, userId } = await signedInUser();
    await setConsent(userId, "ai_chat", true);
    const res = await chat("a".repeat(2001), cookie);
    expect(res.status).toBe(422);
  });

  it("rejects cross-site requests", async () => {
    const { cookie } = await signedInUser();
    const res = await POST(
      new Request("http://localhost:3000/api/companion/chat", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://evil.example", cookie },
        body: JSON.stringify({ messages: [] }),
      }),
    );
    expect(res.status).toBe(403);
  });
});
