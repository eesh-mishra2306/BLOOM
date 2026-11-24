"use client";
import { CalendarHeart, Flower2, House, Leaf, ShieldCheck, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, navItems, type NavIcon } from "@/lib/prefs/model";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, LucideIcon> = { home: House, cycle: CalendarHeart, garden: Flower2, wellness: Leaf, shield: ShieldCheck };

/** Floating bottom bar on phones, a rail on wide screens. Labels switch to neutral words in discreet mode via CSS, so nothing sensitive flashes. */
export function Nav() {
  const pathname = usePathname();
  const items = navItems(false);
  const discreetItems = navItems(true);

  return (
    <nav
      data-lockable
      aria-label="Main"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 lg:inset-x-auto lg:bottom-auto lg:left-4 lg:top-1/2 lg:-translate-y-1/2"
    >
      <ul className="glass mx-auto flex max-w-md items-stretch justify-between rounded-[1.75rem] p-1.5 lg:max-w-none lg:flex-col lg:gap-1 lg:rounded-[2rem]">
        {items.map((item, i) => {
          const Icon = ICONS[item.icon];
          const active = isNavActive(item, pathname);
          return (
            <li key={item.href} className="flex-1 lg:flex-none">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative isolate flex h-14 flex-col items-center justify-center gap-0.5 rounded-[1.35rem] text-xs font-semibold transition-colors lg:h-16 lg:w-[4.5rem]",
                  active ? "text-accent-fg" : "text-muted hover:text-heading",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 -z-10 rounded-[1.35rem] bg-accent"
                    transition={{ type: "spring", stiffness: 480, damping: 36 }}
                  />
                ) : null}
                <Icon aria-hidden className="size-[1.35rem]" strokeWidth={active ? 2.4 : 2} />
                <span className="discreet:hidden">{item.label}</span>
                <span className="hidden discreet:inline">{discreetItems[i].label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
