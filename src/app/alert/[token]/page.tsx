import type { Metadata } from "next";
import { AlertView } from "@/components/safety/alert-view";
import { Wordmark } from "@/components/shell/wordmark";
import { Glass } from "@/components/ui/glass";
import { sosForViewToken } from "@/lib/safety/sos";

export const metadata: Metadata = { title: "SOS alert", robots: { index: false, follow: false } };

export default async function AlertPage({ params, searchParams }: PageProps<"/alert/[token]">) {
  const { token } = await params;
  const q = await searchParams;
  const view = await sosForViewToken(token);
  const d = typeof q.d === "string" ? q.d : null;
  const r = typeof q.r === "string" ? q.r : null;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-5 py-8">
      <Wordmark />
      {view ? (
        <AlertView
          name={view.userName}
          status={view.status}
          createdAt={view.createdAt.toISOString()}
          resolvedAt={view.resolvedAt?.toISOString() ?? null}
          phone={view.phone}
          location={view.location}
          ack={d && r ? { d, r } : null}
        />
      ) : (
        <Glass tier={1} petal>
          <h1 className="text-3xl">This alert has expired</h1>
          <p className="mt-2 text-muted">Alert links work for 24 hours. If you&apos;re worried about someone, call them, or call 112 if they may be in danger.</p>
        </Glass>
      )}
    </main>
  );
}
