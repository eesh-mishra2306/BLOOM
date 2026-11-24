import type { ReactNode } from "react";
import { PetalField } from "@/components/background/petal-field";
import { MochiDock } from "@/components/mochi/dock";
import { AppLock } from "@/components/shell/app-lock";
import { Nav } from "@/components/shell/nav";
import { TopBar } from "@/components/shell/top-bar";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getConsents } from "@/lib/consent";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireOnboardedUser();
  const consents = await getConsents(user.id);
  const name = profile.displayName || user.name;
  return (
    <div className="min-h-dvh lg:pl-24">
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-accent px-4 py-2 font-semibold text-accent-fg focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <PetalField />
      <TopBar name={name} />
      <Nav />
      <main id="main" data-lockable className="mx-auto w-full max-w-5xl px-4 pb-40 pt-3 lg:px-8 lg:pb-16">
        {children}
      </main>
      <MochiDock
        companion={{ name: profile.companionName, species: profile.companionSpecies, color: profile.companionColor, accessory: profile.companionAccessory }}
        userName={name}
        country={profile.country}
        chatAllowed={consents.ai_chat}
        memoryAllowed={consents.ai_memory}
      />
      <AppLock />
    </div>
  );
}
