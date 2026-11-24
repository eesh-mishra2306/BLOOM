"use client";
import { MessageCircleHeart } from "lucide-react";
import { useMochi } from "@/components/mochi/store";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs/store";
import Link from "next/link";

/** Opens the floating companion's chat, or the full chat page when the floating companion is off. */
export function TalkButton({ name }: { name: string }) {
  const setOpen = useMochi((s) => s.setOpen);
  const floating = usePrefs((s) => s.mochi);
  if (!floating)
    return (
      <Button asChild variant="secondary">
        <Link href="/companion">
          <MessageCircleHeart aria-hidden /> Talk to {name}
        </Link>
      </Button>
    );
  return (
    <Button variant="secondary" onClick={() => setOpen(true)}>
      <MessageCircleHeart aria-hidden /> Talk to {name}
    </Button>
  );
}
