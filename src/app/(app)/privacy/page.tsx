import { Download, ExternalLink, Lock, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import { ConsentList } from "@/components/privacy/consent-list";
import { DeleteAccount } from "@/components/privacy/delete-account";
import { ClearThisDevice, PermissionAudit } from "@/components/privacy/device-tools";
import { MemoryList } from "@/components/privacy/memory-list";
import { Glass } from "@/components/ui/glass";
import { listMemories } from "@/lib/ai/memory";
import { aiProviderInfo } from "@/lib/ai/provider";
import { requireOnboardedUser } from "@/lib/auth/session";
import { consentHistory, getConsents } from "@/lib/consent";
import type { ConsentPurpose } from "@/lib/consent-copy";

export const metadata: Metadata = { title: "Privacy and data" };

const KEPT = [
  { what: "Account", detail: "Your email, first name and sign-in details." },
  { what: "Cycle, moods, journal, goals", detail: "Encrypted with a key that belongs to your account alone." },
  { what: "Mochi's notes", detail: "Only what you chose to save, encrypted." },
  { what: "Trusted circle and emergency details", detail: "Encrypted. Contacts see your name, and your location only during an SOS or a journey you share." },
  { what: "SOS and journey history", detail: "When they happened and how they ended. Journey locations are deleted an hour after the journey ends." },
];

export default async function PrivacyPage() {
  const { user, profile } = await requireOnboardedUser("/privacy");
  const [consents, history, memories] = await Promise.all([getConsents(user.id), consentHistory(user.id), listMemories(user.id).catch(() => [])]);
  const ai = aiProviderInfo();
  const fmt = (d: Date) => d.toLocaleString("en-IN", { timeZone: profile.timeZone, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  const changedAt: Partial<Record<ConsentPurpose, string>> = {};
  for (const h of history) changedAt[h.purpose as ConsentPurpose] = fmt(h.createdAt);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-4xl">Privacy and data</h1>
        <p className="max-w-prose text-fg">What BLOOM keeps, who can see it, and how to take it with you or delete it. No ads, no analytics trackers, and nothing is sold.</p>
      </div>

      <Glass tier={1} petal className="space-y-3">
        <h2 className="flex items-center gap-2 text-2xl">
          <Lock aria-hidden className="size-5 text-pink-ink" /> What BLOOM keeps
        </h2>
        <dl className="space-y-2">
          {KEPT.map((k) => (
            <div key={k.what}>
              <dt className="font-semibold text-heading">{k.what}</dt>
              <dd className="text-fg">{k.detail}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted">
          Kept only on this phone or browser: your display settings, the PIN lock, and the offline emergency card. People who run this BLOOM server can technically unlock the encryption keys, so it protects against leaks rather than against them.
        </p>
      </Glass>

      <Glass tier={2} className="space-y-3">
        <h2 className="text-2xl">Permissions you&apos;ve given</h2>
        <ConsentList consents={consents} changedAt={changedAt} />
        {history.length ? (
          <details className="rounded-2xl bg-surface-strong p-3">
            <summary className="cursor-pointer font-semibold text-heading">History of changes ({history.length})</summary>
            <ul className="mt-2 space-y-1 text-sm text-fg">
              {[...history].reverse().map((h, i) => (
                <li key={i}>
                  {fmt(h.createdAt)}: {h.granted ? "turned on" : "turned off"} &ldquo;{h.purpose.replaceAll("_", " ")}&rdquo;
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </Glass>

      <Glass tier={2} className="space-y-3">
        <h2 className="text-2xl">Mochi and AI</h2>
        {ai ? (
          <p className="text-fg">
            Mochi&apos;s replies are written by {ai.label}. While you chat, your messages go to {ai.company} to write each reply. BLOOM doesn&apos;t store your conversations, and Mochi doesn&apos;t read your journal.{" "}
            {ai.privacyUrl ? (
              <a href={ai.privacyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-pink-ink underline underline-offset-4">
                {ai.company}&apos;s privacy policy <ExternalLink aria-hidden className="size-3.5" />
              </a>
            ) : null}
          </p>
        ) : (
          <p className="text-fg">This BLOOM server doesn&apos;t have an AI service set up, so Mochi can&apos;t chat yet and no messages leave the server.</p>
        )}
        <h3 className="pt-2 text-xl">What {profile.companionName} remembers</h3>
        <MemoryList companionName={profile.companionName} memories={memories.map((m) => ({ id: m.id, text: m.text, when: fmt(m.createdAt) }))} />
      </Glass>

      <Glass tier={2} className="space-y-3">
        <h2 className="flex items-center gap-2 text-2xl">
          <Smartphone aria-hidden className="size-5 text-pink-ink" /> This device
        </h2>
        <PermissionAudit />
        <ClearThisDevice />
      </Glass>

      <Glass tier={2} className="space-y-3">
        <h2 className="text-2xl">Your data</h2>
        <p className="text-fg">Download everything BLOOM holds about you, unlocked, in one file you can open in any text editor.</p>
        <a href="/api/privacy/export" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-fg">
          <Download aria-hidden className="size-4" /> Download my data
        </a>
        <div className="border-t border-line pt-4">
          <h3 className="mb-2 text-xl">Delete your account</h3>
          <DeleteAccount />
        </div>
      </Glass>
    </div>
  );
}
