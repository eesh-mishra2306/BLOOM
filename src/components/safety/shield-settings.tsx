"use client";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { saveEmergencyDetails, saveSosSettings, setSosLocation } from "@/app/(app)/safety/actions";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { SwitchRow } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { CONSENT_COPY } from "@/lib/consent-copy";
import { hashPin, usePrefs } from "@/lib/prefs/store";
import { useClientValue } from "@/lib/use-client-value";
import type { EmergencyInfo } from "@/lib/safety/emergency-info";

export function SosSettings({ countdown, message, phone, locationAllowed }: { countdown: number; message: string | null; phone: string | null; locationAllowed: boolean }) {
  const [values, setValues] = useState({ countdown: String(countdown) as "0" | "3" | "5" | "10", message: message ?? "", phone: phone ?? "" });
  const [location, setLocation] = useState(locationAllowed);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 font-semibold text-heading">Countdown before alerts go out</p>
        <Segmented
          label="Countdown"
          value={(["0", "3", "5", "10"].includes(values.countdown) ? values.countdown : "5") as "0" | "3" | "5" | "10"}
          onChange={(v) => setValues({ ...values, countdown: v })}
          options={[
            { value: "0", label: "None" },
            { value: "3", label: "3 s" },
            { value: "5", label: "5 s" },
            { value: "10", label: "10 s" },
          ]}
        />
        <p className="mt-1.5 text-sm text-muted">Gives you time to cancel an accidental tap. Calling your emergency number never waits.</p>
      </div>
      <SwitchRow
        label={CONSENT_COPY.location_sos.title}
        description={CONSENT_COPY.location_sos.body}
        checked={location}
        onCheckedChange={(v) =>
          start(async () => {
            setLocation(v);
            await setSosLocation(v);
          })
        }
      />
      <TextareaField label="Your words at the top of the SOS text (optional)" maxLength={240} placeholder="e.g. Please call me now" value={values.message} onChange={(e) => setValues({ ...values, message: e.target.value })} />
      <InputField label="Your phone number (optional)" type="tel" autoComplete="tel" hint="Shown to your contacts on the alert page so they can call you back." value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} />
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await saveSosSettings({ sosCountdownSeconds: Number(values.countdown), sosMessage: values.message, phone: values.phone });
            toast(res.ok ? "SOS settings saved" : res.error, res.ok ? "success" : "error");
          })
        }
      >
        Save SOS settings
      </Button>
    </div>
  );
}

const BLOOD = ["", "A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−", "Not sure"];

export function EmergencyInfoForm({ info }: { info: EmergencyInfo | null }) {
  const [v, setV] = useState<EmergencyInfo>(info ?? {});
  const [pending, start] = useTransition();
  const keep = usePrefs((s) => s.offlineCard);
  const update = usePrefs((s) => s.update);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Shown on your SOS screen so someone helping you can see it. Stored encrypted. Everything is optional.</p>
      <SelectField label="Blood group" value={v.bloodGroup ?? ""} onChange={(e) => setV({ ...v, bloodGroup: e.target.value || undefined })}>
        {BLOOD.map((b) => (
          <option key={b} value={b}>
            {b || "Choose"}
          </option>
        ))}
      </SelectField>
      <InputField label="Allergies" maxLength={200} value={v.allergies ?? ""} onChange={(e) => setV({ ...v, allergies: e.target.value })} />
      <InputField label="Medicines you take" maxLength={200} value={v.medications ?? ""} onChange={(e) => setV({ ...v, medications: e.target.value })} />
      <InputField label="Conditions responders should know about" maxLength={200} value={v.conditions ?? ""} onChange={(e) => setV({ ...v, conditions: e.target.value })} />
      <TextareaField label="Anything else" maxLength={300} value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value })} />
      <SwitchRow
        label="Keep a copy on this phone for offline SOS"
        description="Your contacts and this information are saved in this browser so the emergency page works without internet."
        checked={keep}
        onCheckedChange={(on) => update({ offlineCard: on })}
      />
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await saveEmergencyDetails(v);
            toast(res.ok ? "Emergency information saved" : res.error, res.ok ? "success" : "error");
          })
        }
      >
        Save emergency information
      </Button>
    </div>
  );
}

export function DiscreetSettings() {
  const prefs = usePrefs();
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function savePin() {
    if (!/^\d{4,6}$/.test(pin)) return setError("Use 4 to 6 digits.");
    if (pin !== confirm) return setError("The two PINs don't match.");
    const { hash, salt } = await hashPin(pin);
    prefs.update({ lock: { enabled: true, pinHash: hash, salt, timeoutMin: prefs.lock.timeoutMin } });
    sessionStorage.setItem("bloom.unlockedAt", String(Date.now()));
    setPinOpen(false);
    setPin("");
    setConfirm("");
    toast("App lock is on for this device", "success");
  }

  return (
    <div className="space-y-2">
      <SwitchRow
        label="Discreet mode"
        description="BLOOM looks like a plain planner called Daybook: neutral colours, no petals or Mochi, and plain words like Calendar and Help."
        checked={prefs.discreet}
        onCheckedChange={(v) => prefs.update({ discreet: v })}
      />
      <div className="py-3">
        {/* Remounts when the saved address loads from this device, so the field starts from it. */}
        <QuickExitField key={prefs.quickExitUrl} saved={prefs.quickExitUrl} onSave={(quickExitUrl) => prefs.update({ quickExitUrl })} />
      </div>
      <SwitchRow
        label="Lock BLOOM with a PIN on this device"
        description="Keeps casual eyes out on a shared phone. It can't stop someone who knows your phone's passcode. Emergency SOS stays reachable."
        checked={prefs.lock.enabled}
        onCheckedChange={(v) => (v ? setPinOpen(true) : prefs.update({ lock: { enabled: false, timeoutMin: prefs.lock.timeoutMin } }))}
      />
      {prefs.lock.enabled ? (
        <div className="pb-2">
          <p className="mb-2 font-semibold text-heading">Lock after</p>
          <Segmented
            size="sm"
            label="Lock after"
            value={String(prefs.lock.timeoutMin) as "1" | "5" | "15"}
            onChange={(v) => prefs.update({ lock: { ...prefs.lock, timeoutMin: Number(v) as 1 | 5 | 15 } })}
            options={[
              { value: "1", label: "1 min" },
              { value: "5", label: "5 min" },
              { value: "15", label: "15 min" },
            ]}
          />
        </div>
      ) : null}
      <Sheet open={pinOpen} onOpenChange={setPinOpen} title="Choose a PIN" description="4 to 6 digits. It stays on this device only.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void savePin();
          }}
        >
          <InputField label="PIN" inputMode="numeric" type="password" autoComplete="new-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          <InputField label="Type it again" inputMode="numeric" type="password" autoComplete="new-password" maxLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} error={error} />
          <Button type="submit" size="lg">
            Turn on app lock
          </Button>
        </form>
      </Sheet>
    </div>
  );
}

export function OfflineReadiness() {
  const supported = useClientValue(() => "serviceWorker" in navigator && "caches" in window, true);
  const [checked, setState] = useState<"checking" | "ready" | "not-ready">("checking");
  const state = supported ? checked : "unsupported";
  useEffect(() => {
    if (!supported) return;
    const check = async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const hit = await caches.match("/sos-offline.html");
      setState(reg && hit ? "ready" : "not-ready");
    };
    void check();
    const t = window.setTimeout(check, 3000);
    return () => window.clearTimeout(t);
  }, [supported]);
  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 text-fg">
        {state === "ready" ? <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-leaf dark:text-petal" /> : <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />}
        <span>
          {state === "ready"
            ? "This device is ready: if you lose internet, opening BLOOM shows an emergency page that can call and text from your phone."
            : state === "checking"
              ? "Checking this device…"
              : state === "unsupported"
                ? "This browser can't keep the offline emergency page. Calling your emergency number from the SOS screen still works whenever BLOOM is open."
                : "Not ready yet. Keep BLOOM open for a moment while you're online and it will prepare the offline page."}
        </span>
      </p>
      <Button asChild variant="secondary" size="sm">
        <a href="/sos-offline.html">Preview the offline emergency page</a>
      </Button>
    </div>
  );
}

function QuickExitField({ saved, onSave }: { saved: string; onSave: (url: string) => void }) {
  const [url, setUrl] = useState(saved);
  return (
    <InputField
      label="Quick exit goes to"
      type="url"
      value={url}
      onChange={(e) => setUrl(e.target.value)}
      onBlur={() => {
        try {
          const u = new URL(url);
          if (u.protocol !== "https:") throw new Error("not https");
          if (u.toString() !== saved) onSave(u.toString());
        } catch {
          setUrl(saved);
          toast("Use a web address starting with https://", "error");
        }
      }}
      hint="The Exit button and pressing Escape three times jump here and hide BLOOM."
    />
  );
}
