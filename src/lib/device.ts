/** Rough device capability, used to scale 3D and particle effects. */
export function deviceTier(): "high" | "low" {
  if (typeof navigator === "undefined") return "high";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return "low";
  if ((nav.hardwareConcurrency ?? 8) <= 4) return "low";
  if ((nav.deviceMemory ?? 8) <= 4) return "low";
  return "high";
}

let webglCache: boolean | undefined;
export function webglAvailable(): boolean {
  if (webglCache !== undefined) return webglCache;
  try {
    const c = document.createElement("canvas");
    webglCache = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

export function prefersReducedMotion(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.motion === "reduced";
}
