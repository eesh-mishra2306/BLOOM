"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Keeps the follow-along page fresh while it's on screen. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}

/** "I'm on it": tells the traveller someone saw the missed check-in. */
export function OnItButton({ d, r, first }: { d: string; r: string; first: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  return (
    <div className="space-y-1">
      <Button
        variant="secondary"
        size="lg"
        disabled={state === "busy" || state === "done"}
        onClick={async () => {
          setState("busy");
          const res = await fetch("/api/safety/ack", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ d, r }) }).catch(() => null);
          setState(res?.ok ? "done" : "error");
        }}
      >
        {state === "done" ? `${first} can see you're on it` : "I'm on it"}
      </Button>
      {state === "error" ? <p className="text-sm font-semibold text-sos-bg">Couldn&apos;t send that. Try calling {first} instead.</p> : null}
    </div>
  );
}
