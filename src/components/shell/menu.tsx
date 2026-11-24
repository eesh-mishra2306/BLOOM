"use client";
import { BookHeart, Footprints, LockKeyhole, LogOut, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth/client";

const LINKS = [
  { href: "/companion", label: "Mochi", discreetLabel: "Assistant", icon: Sparkles },
  { href: "/journal", label: "Journal", discreetLabel: "Notes", icon: BookHeart },
  { href: "/journey", label: "Journeys", discreetLabel: "Trips", icon: Footprints },
  { href: "/settings", label: "Settings", discreetLabel: "Settings", icon: Settings2 },
  { href: "/privacy", label: "Privacy and data", discreetLabel: "Privacy and data", icon: LockKeyhole },
];

export function MenuButton({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const initial = (name.trim()[0] ?? "B").toUpperCase();

  async function signOut() {
    await authClient.signOut();
    setOpen(false);
    router.replace("/auth");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="grid size-11 place-items-center rounded-full bg-accent-soft font-display text-lg font-bold text-heading"
      >
        {initial}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Menu">
        <nav aria-label="More" className="flex flex-col gap-1">
          {LINKS.map(({ href, label, discreetLabel, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex h-14 items-center gap-3 rounded-2xl px-3 text-lg font-semibold text-heading hover:bg-accent-soft"
            >
              <Icon aria-hidden className="size-5 text-accent" />
              <span className="discreet:hidden">{label}</span>
              <span className="hidden discreet:inline">{discreetLabel}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={signOut}
            className="mt-2 flex h-14 items-center gap-3 rounded-2xl px-3 text-lg font-semibold text-muted hover:bg-accent-soft"
          >
            <LogOut aria-hidden className="size-5" />
            Sign out
          </button>
        </nav>
      </Sheet>
    </>
  );
}
