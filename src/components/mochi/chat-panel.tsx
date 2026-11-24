"use client";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, BookmarkPlus, RotateCcw, Square } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { allowMochiChat, rememberForMochi } from "@/app/(app)/companion/actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { parseSuggestions, SUGGESTIONS } from "@/lib/ai/suggestions";
import { resourcesFor, triage, TRIAGE_HEADLINE } from "@/lib/ai/triage";
import type { BloomUIMessage } from "@/lib/ai/types";
import { CONSENT_COPY } from "@/lib/consent-copy";
import { emergencyFor } from "@/lib/safety/emergency-numbers";
import { emitBloom } from "@/lib/events";
import { cn } from "@/lib/utils";
import { mochiChat, readChatError } from "./chat-client";
import { RichText } from "./rich-text";
import { SafetyCard } from "./safety-card";

const STARTERS = ["My cramps are really bad today", "I can't sleep", "Help me calm down", "Is my cycle normal?"];

type ChatPanelProps = {
  companionName: string;
  userName: string;
  country: string;
  chatAllowed: boolean;
  memoryAllowed: boolean;
  className?: string;
};

function textOf(m: BloomUIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export function ChatPanel({ companionName, userName, country, chatAllowed, memoryAllowed, className }: ChatPanelProps) {
  const { messages, sendMessage, status, error, stop, regenerate, clearError } = useChat({ chat: mochiChat, throttle: 50 });
  const [input, setInput] = useState("");
  const [override, setAllowed] = useState<boolean | null>(null);
  const allowed = override ?? chatAllowed;
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const problem = readChatError(error);

  useEffect(() => {
    if (status === "streaming") emitBloom({ type: "mochi", event: "chat-streaming" });
  }, [status]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // Safety help appears instantly from on-device triage — before, or without, any server reply.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastIsUser = messages[messages.length - 1]?.role === "user";
  const localSafety = useMemo(() => (lastUser ? triage(textOf(lastUser)) : null), [lastUser]);

  function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    if (clean.length > 2000) return toast("Messages can be up to 2,000 characters.", "error");
    clearError();
    emitBloom({ type: "mochi", event: "chat-sent" });
    if (triage(clean).level !== "none") emitBloom({ type: "mochi", event: "concern" });
    void sendMessage({ text: clean });
    setInput("");
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  }

  function remember(text: string) {
    startTransition(async () => {
      const res = await rememberForMochi(text);
      toast(res.ok ? `${companionName} will remember that.` : res.error, res.ok ? "success" : "error");
    });
  }

  if (!allowed) {
    return (
      <div className={cn("flex flex-1 flex-col justify-center gap-4 p-5", className)}>
        <p className="font-display text-2xl text-heading">Want to chat with {companionName}?</p>
        <p className="text-muted">{CONSENT_COPY.ai_chat.body}</p>
        <Button
          size="lg"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await allowMochiChat();
              setAllowed(true);
            })
          }
        >
          Turn on chat
        </Button>
        <p className="text-sm text-muted">
          You can turn this off any time in <Link href="/privacy" className="font-semibold underline underline-offset-4">Privacy</Link>. In an emergency, use SOS or call {emergencyFor(country).emergency}.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div ref={listRef} role="log" aria-live="polite" aria-label={`Conversation with ${companionName}`} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="max-w-[85%] rounded-[1.25rem] rounded-bl-md bg-accent-soft px-4 py-3 text-fg">
              Hi {userName}! I&apos;m here if you want to talk about your cycle, your day, or anything on your mind.
            </div>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="min-h-10 rounded-full border border-line bg-surface-strong px-4 text-sm font-semibold text-heading hover:border-accent/50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, idx) => {
          if (m.role === "user") {
            const isLastUser = m.id === lastUser?.id;
            return (
              <div key={m.id} className="flex flex-col items-end gap-1">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-[1.25rem] rounded-br-md bg-accent px-4 py-3 text-accent-fg">{textOf(m)}</div>
                {memoryAllowed && isLastUser && !busy ? (
                  <button type="button" onClick={() => remember(textOf(m))} className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-heading">
                    <BookmarkPlus aria-hidden className="size-3.5" /> Ask {companionName} to remember this
                  </button>
                ) : null}
                {isLastUser && lastIsUser && localSafety && localSafety.level !== "none" ? (
                  <SafetyCard className="w-full" headline={TRIAGE_HEADLINE[localSafety.level]} resources={resourcesFor(localSafety.level, country)} />
                ) : null}
              </div>
            );
          }
          const sources = m.parts.find((p) => p.type === "data-sources");
          const text = textOf(m);
          const { clean, suggestions } = parseSuggestions(text);
          return (
            <div key={m.id} className="flex flex-col items-start gap-2">
              {m.parts.map((p, i) => {
                if (p.type === "data-safety") return <SafetyCard key={i} className="w-full" headline={p.data.headline} resources={p.data.resources} />;
                if (p.type === "data-notice")
                  return (
                    <p key={i} className="max-w-[90%] rounded-2xl bg-calm px-4 py-3 text-sm text-fg">
                      {p.data.message}
                    </p>
                  );
                return null;
              })}
              {clean ? (
                <div className="max-w-[90%] rounded-[1.25rem] rounded-bl-md bg-surface-strong px-4 py-3 text-fg shadow-sm ring-1 ring-line">
                  <RichText
                    text={clean}
                    onCite={(n) =>
                      sources && sources.type === "data-sources" && sources.data.items[n - 1] ? (
                        <a href={sources.data.items[n - 1].url} target="_blank" rel="noopener noreferrer" className="mx-0.5 rounded-md bg-accent-soft px-1 text-xs font-bold text-heading no-underline">
                          {n}
                        </a>
                      ) : null
                    }
                  />
                </div>
              ) : null}
              {suggestions.length && !(busy && idx === messages.length - 1) ? (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <Button key={s} asChild variant="soft" size="sm">
                      <Link href={SUGGESTIONS[s].href}>{SUGGESTIONS[s].label}</Link>
                    </Button>
                  ))}
                </div>
              ) : null}
              {sources && sources.type === "data-sources" && clean ? (
                <p className="text-xs text-muted">
                  Sources:{" "}
                  {sources.data.items.map((s, i) => (
                    <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
                      {i + 1}. {s.publisher} — {s.title}
                      {i < sources.data.items.length - 1 ? "; " : ""}
                    </a>
                  ))}
                </p>
              ) : null}
            </div>
          );
        })}

        {status === "submitted" ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-muted" aria-live="polite">
            <span className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </span>
            {companionName} is thinking
          </p>
        ) : null}

        {problem ? (
          <div role="alert" className="space-y-2 rounded-2xl bg-sos-bg/10 px-4 py-3 text-sm text-fg">
            <p className="font-semibold">
              {problem.code === "consent_required"
                ? "Chat with Mochi is turned off."
                : problem.message || "Mochi couldn't reply just now."}
            </p>
            {problem.code === "consent_required" ? (
              <Button size="sm" onClick={() => setAllowed(false)}>
                Review chat permission
              </Button>
            ) : problem.code !== "rate_limited" ? (
              <Button size="sm" variant="secondary" onClick={() => regenerate()}>
                <RotateCcw aria-hidden /> Try again
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <form
        className="flex items-end gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="mochi-input" className="sr-only">
          Message {companionName}
        </label>
        <textarea
          id="mochi-input"
          rows={1}
          value={input}
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={`Message ${companionName}`}
          className="max-h-32 min-h-12 flex-1 resize-none rounded-[1.25rem] border border-line bg-surface-strong px-4 py-3 text-base text-fg placeholder:text-muted/80 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
        />
        {busy ? (
          <Button type="button" size="icon" variant="secondary" onClick={() => stop()} aria-label="Stop reply">
            <Square aria-hidden />
          </Button>
        ) : (
          <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim()}>
            <ArrowUp aria-hidden />
          </Button>
        )}
      </form>
      <p className="px-4 pb-3 text-center text-[0.72rem] text-muted">
        {companionName} is an AI, not a doctor. For emergencies use SOS or call {emergencyFor(country).emergency}.
      </p>
    </div>
  );
}
