import { ChevronRight, EyeOff, LockKeyhole, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { Glass } from "@/components/ui/glass";
import { requireOnboardedUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, profile } = await requireOnboardedUser("/settings");
  const links = [
    { href: "/companion", icon: Sparkles, title: `${profile.companionName}'s look and personality`, body: "Name, species, colour and how they talk." },
    { href: "/safety#discreet", icon: EyeOff, title: "Discreet mode and app lock", body: "A plain look, quick exit, and a PIN for shared phones." },
    { href: "/privacy", icon: LockKeyhole, title: "Privacy and data", body: "Permissions, download your data, delete your account." },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-4xl">Settings</h1>
      <div className="grid gap-5 lg:grid-cols-2">
        <Glass tier={1} petal className="space-y-4">
          <h2 className="text-2xl">Appearance</h2>
          <AppearanceSettings />
        </Glass>
        <div className="space-y-5">
          <Glass tier={2} className="space-y-4">
            <h2 className="text-2xl">You and your region</h2>
            <p className="text-sm text-muted">Signed in as {user.email}</p>
            <ProfileSettings
              displayName={profile.displayName ?? user.name}
              country={profile.country}
              timeZone={profile.timeZone}
              cycleLength={profile.typicalCycleLength}
              periodLength={profile.typicalPeriodLength}
            />
          </Glass>
          <nav aria-label="More settings" className="space-y-2">
            {links.map(({ href, icon: Icon, title, body }) => (
              <Link key={href} href={href} className="glass-lite flex items-center gap-3 rounded-3xl p-4 hover:border-accent/40">
                <Icon aria-hidden className="size-5 shrink-0 text-pink-ink" />
                <span className="flex-1">
                  <span className="block font-semibold text-heading">{title}</span>
                  <span className="block text-sm text-muted">{body}</span>
                </span>
                <ChevronRight aria-hidden className="size-5 text-muted" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <Glass tier={2} className="space-y-4">
        <h2 className="text-2xl">Signing in</h2>
        <SecuritySettings />
      </Glass>
    </div>
  );
}
