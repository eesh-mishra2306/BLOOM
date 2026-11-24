"use client";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { deviceTier, webglAvailable } from "@/lib/device";
import { useClientValue } from "@/lib/use-client-value";
import { cn } from "@/lib/utils";
import type { Expression } from "./behaviour";
import { MochiFlat } from "./mochi-flat";
import type { Species } from "./palette";
import { CompanionRig, type Accessory } from "./rig";

/** Renders on demand at `fps`; 0 stops rendering. Never renders while the tab is hidden. */
function Ticker({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (fps <= 0) return;
    let raf = 0;
    let last = 0;
    const interval = 1000 / fps;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || t - last < interval) return;
      last = t;
      invalidate();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fps, invalidate]);
  return null;
}

type MochiCanvasProps = {
  species: Species;
  color: string;
  accessory?: Accessory;
  expression: Expression;
  bounce: number;
  wave?: number;
  fps: number;
  calm?: boolean;
  className?: string;
  label: string;
  /** Track the pointer anywhere on the page (head turns toward it). */
  followPointer?: boolean;
};

export function MochiCanvas({ species, color, accessory, expression, bounce, wave, fps, calm, className, label, followPointer = true }: MochiCanvasProps) {
  const webgl = useClientValue<boolean | null>(webglAvailable, null);
  const quality = useClientValue(deviceTier, "high");
  const [lost, setLost] = useState(false);
  const support: "unknown" | "webgl" | "flat" = webgl === null ? "unknown" : webgl && !lost ? "webgl" : "flat";
  const wrap = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!followPointer || support !== "webgl") return;
    const onMove = (e: PointerEvent) => {
      const r = wrap.current?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      pointer.current = { x: (e.clientX - cx) / Math.max(240, window.innerWidth / 3), y: (e.clientY - cy) / Math.max(240, window.innerHeight / 3) };
    };
    const onLeave = () => (pointer.current = null);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [followPointer, support]);

  const flatMood = expression === "asleep" ? "asleep" : expression === "happy" || expression === "comforting" ? "happy" : "idle";

  return (
    <div ref={wrap} role="img" aria-label={label} className={cn("relative", className)}>
      {support === "webgl" ? (
        <Canvas
          frameloop="demand"
          flat
          dpr={[1, quality === "high" ? 1.75 : 1.25]}
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          camera={{ position: [0, 0.05, 5.2], fov: 30 }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              setLost(true);
            });
          }}
          style={{ pointerEvents: "none" }}
          aria-hidden
        >
          <Ticker fps={fps} />
          <hemisphereLight args={["#fff8fa", "#efe3fb", 1.55]} />
          <directionalLight position={[2.4, 3.6, 3.2]} intensity={1.15} color="#fff6ee" />
          <directionalLight position={[-3, 1.2, -2.5]} intensity={0.7} color="#ffb8d0" />
          <ambientLight intensity={0.25} color="#ffffff" />
          <CompanionRig species={species} color={color} accessory={accessory} expression={expression} bounce={bounce} wave={wave} quality={quality} calm={calm} lookAt={pointer} />
        </Canvas>
      ) : (
        <MochiFlat species={species} color={color} mood={flatMood} className="size-full" />
      )}
    </div>
  );
}
