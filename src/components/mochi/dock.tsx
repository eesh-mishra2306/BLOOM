"use client";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { usePrefs } from "@/lib/prefs/store";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";
import { MochiCanvas } from "./mochi-canvas";
import type { Species } from "./palette";
import type { Accessory } from "./rig";
import { useMochi } from "./store";
import { useMochiBus } from "./use-mochi-bus";

/** Pages that already show Mochi in their own scene, or must stay free of distraction. */
const HIDDEN_ON = ["/companion", "/bloomverse", "/sos"];

export type CompanionProps = { name: string; species: Species; color: string; accessory: Accessory };

type DockProps = { companion: CompanionProps; userName: string; country: string; chatAllowed: boolean; memoryAllowed: boolean };

const STATUS: Record<string, string> = {
  asleep: "Napping",
  sleepy: "Getting sleepy",
  thinking: "Thinking…",
  talking: "Talking",
  comforting: "Here with you",
  listening: "Listening",
};

/**
 * Mochi Everywhere: a live 3D companion in the corner of every app screen that opens into
 * the chat. The same canvas element moves between the bubble and the panel header, so
 * WebGL is created once.
 */
export function MochiDock({ companion, userName, country, chatAllowed, memoryAllowed }: DockProps) {
  useMochiBus();
  const pathname = usePathname();
  const { hydrated, mochi, discreet, motion: motionPref } = usePrefs();
  const { expression, bounce, wave, hidden, open, setOpen, dispatch, greet } = useMochi();
  const [hello, setHello] = useState(false);

  // Wave hello once per browser session.
  useEffect(() => {
    if (!hydrated || !mochi || discreet) return;
    if (sessionStorage.getItem("bloom.greeted")) return;
    sessionStorage.setItem("bloom.greeted", "1");
    const t1 = setTimeout(() => {
      greet();
      setHello(true);
    }, 900);
    const t2 = setTimeout(() => setHello(false), 6500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [hydrated, mochi, discreet, greet]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!hydrated || !mochi || discreet || hidden || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const reduced = typeof document !== "undefined" && document.documentElement.dataset.motion === "reduced";
  const fps = open ? 30 : expression === "asleep" ? 8 : reduced || motionPref === "reduced" ? 12 : 24;
  const status = STATUS[expression] ?? "Here if you need me";

  return (
    <>
      {open ? <button type="button" aria-label={`Close ${companion.name}`} className="fixed inset-0 z-[49] bg-berry/10 sm:hidden" onClick={() => setOpen(false)} /> : null}
      <motion.div
        data-mochi-dock
        layout
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        // Layout animations use transforms; let the 3D canvas re-measure once they settle.
        onLayoutAnimationComplete={() => window.dispatchEvent(new Event("resize"))}
        role={open ? "dialog" : undefined}
        aria-label={open ? `Chat with ${companion.name}` : undefined}
        className={cn(
          "fixed z-50",
          open
            ? "glass inset-x-2 bottom-2 top-[4.75rem] flex flex-col overflow-hidden rounded-[1.75rem] !bg-surface-strong sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[min(42rem,calc(100dvh-7rem))] sm:w-[25rem]"
            : "bottom-[6.75rem] right-3 lg:bottom-6 lg:right-6",
        )}
      >
        <div className={cn(open ? "flex items-center gap-3 border-b border-line px-3 py-2" : "relative")}>
          <button
            type="button"
            onClick={() => {
              if (open) dispatch("pet");
              else {
                setOpen(true);
                dispatch("tap");
              }
            }}
            aria-label={open ? `Pet ${companion.name}` : `Talk to ${companion.name}`}
            aria-expanded={open}
            className={cn(
              "relative shrink-0 rounded-full",
              open ? "size-20" : "glass size-[5.75rem] shadow-[0_14px_30px_-12px_rgb(102_38_63/0.45)] transition-transform hover:scale-105 active:scale-95",
            )}
          >
            <MochiCanvas
              species={companion.species}
              color={companion.color}
              accessory={companion.accessory}
              expression={expression}
              bounce={bounce}
              wave={wave}
              fps={fps}
              calm={reduced}
              className="size-full"
              label={`${companion.name}, ${status.toLowerCase()}`}
            />
            {expression === "asleep" && !open ? (
              <span aria-hidden className="pointer-events-none absolute -right-1 -top-1 font-display text-lg font-bold text-accent">
                z<span className="text-sm">z</span>
              </span>
            ) : null}
          </button>
          {open ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl leading-tight text-heading">{companion.name}</p>
                <p className="text-sm text-muted">{status}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full text-heading hover:bg-accent-soft" aria-label="Close chat">
                <X aria-hidden className="size-5" />
              </button>
            </>
          ) : null}
        </div>
        {open ? <ChatPanel companionName={companion.name} userName={userName} country={country} chatAllowed={chatAllowed} memoryAllowed={memoryAllowed} /> : null}
      </motion.div>
      <AnimatePresence>
        {hello && !open ? (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            className="glass fixed bottom-[13.25rem] right-4 z-50 max-w-[14rem] rounded-2xl rounded-br-md px-4 py-2.5 text-sm font-semibold text-heading lg:bottom-32 lg:right-8"
          >
            Hi {userName}! Tap me if you want to talk.
          </motion.p>
        ) : null}
      </AnimatePresence>
    </>
  );
}
