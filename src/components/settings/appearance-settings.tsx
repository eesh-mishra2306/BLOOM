"use client";
import { Segmented } from "@/components/ui/segmented";
import { SwitchRow } from "@/components/ui/switch";
import { usePrefs } from "@/lib/prefs/store";

/** Display preferences. They live on this device only. */
export function AppearanceSettings() {
  const p = usePrefs();
  return (
    <div className="space-y-5">
      <Row label="Theme">
        <Segmented
          label="Theme"
          size="sm"
          value={p.theme}
          onChange={(theme) => p.update({ theme })}
          options={[
            { value: "system", label: "Match device" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </Row>
      <Row label="Text size">
        <Segmented
          label="Text size"
          size="sm"
          value={String(p.textScale) as "1" | "1.15" | "1.3"}
          onChange={(v) => p.update({ textScale: Number(v) as 1 | 1.15 | 1.3 })}
          options={[
            { value: "1", label: "Default" },
            { value: "1.15", label: "Larger" },
            { value: "1.3", label: "Largest" },
          ]}
        />
      </Row>
      <Row label="Motion">
        <Segmented
          label="Motion"
          size="sm"
          value={p.motion}
          onChange={(motion) => p.update({ motion })}
          options={[
            { value: "system", label: "Match device" },
            { value: "reduced", label: "Less" },
            { value: "full", label: "Full" },
          ]}
        />
      </Row>
      <div className="space-y-3">
        <SwitchRow label="High contrast" description="Stronger colours and borders, easier to read in bright light." checked={p.contrast === "high"} onCheckedChange={(on) => p.update({ contrast: on ? "high" : "normal" })} />
        <SwitchRow label="Falling petals" description="The petals drifting behind the app. Turn off to save battery." checked={p.petals} onCheckedChange={(petals) => p.update({ petals })} />
        <SwitchRow label="Mochi in the corner" description="Your companion floats on every screen and opens the chat when tapped." checked={p.mochi} onCheckedChange={(mochi) => p.update({ mochi })} />
      </div>
      <p className="text-sm text-muted">These settings are saved on this device only.</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="font-semibold text-heading">{label}</p>
      {children}
    </div>
  );
}
