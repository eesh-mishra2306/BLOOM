"use client";
import { Copy, MessageCircle, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { detectPlatform, smsLink } from "@/lib/safety/links";
import { useClientValue } from "@/lib/use-client-value";

/** Copy, WhatsApp, SMS and the system share sheet — whichever the person sharing prefers. */
export function ShareButtons({ text, phones, title, copied = "Copied" }: { text: string; phones: string[]; title: string; copied?: string }) {
  const platform = useClientValue(() => detectPlatform(navigator.userAgent), "other");
  const canShare = useClientValue(() => "share" in navigator, false);
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            toast(copied, "success");
          } catch {
            toast("Couldn't copy. Select the link and copy it instead.", "error");
          }
        }}
      >
        <Copy aria-hidden /> Copy
      </Button>
      <Button asChild variant="secondary">
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
          <MessageCircle aria-hidden /> WhatsApp
        </a>
      </Button>
      <Button asChild variant="secondary">
        <a href={smsLink(phones, text, platform)}>
          <Send aria-hidden /> Text message
        </a>
      </Button>
      {canShare ? (
        <Button variant="secondary" onClick={() => void navigator.share({ title, text }).catch(() => undefined)}>
          <Share2 aria-hidden /> More
        </Button>
      ) : null}
    </div>
  );
}
