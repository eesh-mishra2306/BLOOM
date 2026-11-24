"use client";
import { useOptimistic, useTransition } from "react";
import { updateConsent } from "@/app/(app)/privacy/actions";
import { SwitchRow } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { CONSENT_COPY, CONSENT_PURPOSES, type ConsentPurpose } from "@/lib/consent-copy";

export function ConsentList({ consents, changedAt }: { consents: Record<ConsentPurpose, boolean>; changedAt: Partial<Record<ConsentPurpose, string>> }) {
  const [state, setOptimistic] = useOptimistic(consents, (s, [p, v]: [ConsentPurpose, boolean]) => ({ ...s, [p]: v }));
  const [, start] = useTransition();
  return (
    <div className="divide-y divide-line">
      {CONSENT_PURPOSES.map((p) => (
        <div key={p} className="py-3 first:pt-0 last:pb-0">
          <SwitchRow
            label={CONSENT_COPY[p].title}
            description={
              <>
                {CONSENT_COPY[p].body}
                {changedAt[p] ? <span className="mt-1 block text-xs">Last changed {changedAt[p]}</span> : null}
              </>
            }
            checked={state[p]}
            onCheckedChange={(on) =>
              start(async () => {
                setOptimistic([p, on]);
                const res = await updateConsent(p, on);
                if (!res.ok) toast("Couldn't change that. Try again.", "error");
              })
            }
          />
        </div>
      ))}
    </div>
  );
}
