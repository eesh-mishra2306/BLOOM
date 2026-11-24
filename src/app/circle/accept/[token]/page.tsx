import type { Metadata } from "next";
import { Wordmark } from "@/components/shell/wordmark";
import { InviteResponse } from "@/components/safety/invite-response";
import { Glass } from "@/components/ui/glass";
import { findInvite } from "@/lib/safety/contacts";
import { vapidPublicKey } from "@/lib/safety/push";

export const metadata: Metadata = { title: "Trusted contact invite", robots: { index: false, follow: false } };

export default async function AcceptInvitePage({ params }: PageProps<"/circle/accept/[token]">) {
  const { token } = await params;
  const invite = await findInvite(token);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-5 py-8">
      <Wordmark />
      {invite ? (
        <InviteResponse token={token} inviterName={invite.inviterName} contactName={invite.contactName} initialStatus={invite.status} initialDevices={invite.devices} vapidKey={vapidPublicKey()} />
      ) : (
        <Glass tier={1} petal>
          <h1 className="text-3xl">This invite link has expired</h1>
          <p className="mt-2 text-muted">It may have been replaced by a newer one. Ask the person who sent it for a new link.</p>
        </Glass>
      )}
    </main>
  );
}
