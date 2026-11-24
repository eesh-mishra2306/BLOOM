import Link from "next/link";
import { MenuButton } from "./menu";
import { QuickExitButton } from "./quick-exit";
import { SosLink } from "./sos-link";
import { Wordmark } from "./wordmark";

export function TopBar({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-40 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pl-28 lg:pr-8">
      <div className="glass mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 rounded-full pl-5 pr-2.5">
        <Link href="/dashboard" className="rounded-full">
          <Wordmark />
          <span className="sr-only">Home</span>
        </Link>
        <div className="flex items-center gap-1">
          <QuickExitButton className="max-sm:px-2.5 max-sm:[&>span]:hidden" />
          <SosLink />
          <MenuButton name={name} />
        </div>
      </div>
    </header>
  );
}
