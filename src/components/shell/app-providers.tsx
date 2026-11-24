"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/toast";
import { PrefsSync } from "./prefs-sync";
import { ServiceWorkerRegister } from "./sw-register";
import { usePrefs } from "@/lib/prefs/store";

export function AppProviders({ children }: { children: ReactNode }) {
  const motion = usePrefs((s) => s.motion);
  return (
    <MotionConfig reducedMotion={motion === "full" ? "never" : motion === "reduced" ? "always" : "user"}>
      <PrefsSync />
      <ServiceWorkerRegister />
      <Toaster />
      {children}
    </MotionConfig>
  );
}
