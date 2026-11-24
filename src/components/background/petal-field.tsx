"use client";
import { useEffect, useRef } from "react";
import { onBloom } from "@/lib/events";
import { usePrefs } from "@/lib/prefs/store";

/**
 * Drifting petals behind the interface. 2D canvas (not WebGL) so Mochi keeps the only GPU
 * context; petals are pre-rendered sprites at three blur levels for a cheap depth of field.
 * 30 fps cap, pauses when the tab is hidden, freezes for reduced motion, vanishes in an emergency.
 */

const LIGHT = ["#ffb8d0", "#ff8fb4", "#ff667a", "#eadcf8", "#ffd3e2"];
const DARK = ["#ff4f91", "#ff8fb4", "#b48ce0", "#ff667a", "#ffb8d0"];
const BLURS = [0, 2.5, 6];
const SPRITE = 64;

type Petal = { x: number; y: number; z: number; size: number; rot: number; vr: number; vx: number; vy: number; sway: number; sprite: HTMLCanvasElement; alpha: number };

function makeSprite(color: string, blur: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = SPRITE;
  const g = c.getContext("2d")!;
  const r = SPRITE * 0.3;
  g.translate(SPRITE / 2, SPRITE / 2);
  if (blur) g.filter = `blur(${blur}px)`;
  const grad = g.createRadialGradient(0, r * 0.2, 1, 0, 0, r * 1.2);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, color);
  g.fillStyle = grad;
  g.beginPath();
  // A cherry-blossom petal: rounded body with a small notch at the tip.
  g.moveTo(0, r);
  g.bezierCurveTo(r * 1.05, r * 0.55, r * 0.95, -r * 0.75, r * 0.22, -r);
  g.lineTo(0, -r * 0.78);
  g.lineTo(-r * 0.22, -r);
  g.bezierCurveTo(-r * 0.95, -r * 0.75, -r * 1.05, r * 0.55, 0, r);
  g.fill();
  return c;
}

export function PetalField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const hydrated = usePrefs((s) => s.hydrated);
  const enabled = usePrefs((s) => s.petals && !s.discreet);

  useEffect(() => {
    const canvas = ref.current;
    if (!hydrated || !enabled || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const root = document.documentElement;
    const reduced = root.dataset.motion === "reduced";
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowEnd = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const palette = root.dataset.theme === "dark" ? DARK : LIGHT;
    const sprites = palette.map((color) => BLURS.map((b) => makeSprite(color, b)));

    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const spawn = (initial: boolean): Petal => {
      const z = 0.3 + Math.random() * 0.7; // 1 = nearest
      const blurLevel = z > 0.75 ? 0 : z > 0.5 ? 1 : 2;
      return {
        x: Math.random() * (w + 80) - 80,
        y: initial ? Math.random() * h : -40 - Math.random() * 60,
        z,
        size: 12 + z * 26,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.9,
        vx: 6 + z * 10,
        vy: 9 + z * 16,
        sway: Math.random() * Math.PI * 2,
        sprite: sprites[Math.floor(Math.random() * sprites.length)][blurLevel],
        alpha: 0.22 + z * 0.42,
      };
    };

    const count = reduced ? 9 : lowEnd || w < 640 ? 11 : 18;
    const petals = Array.from({ length: count }, () => spawn(true));
    const pointer = { x: -9999, y: -9999 };
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const scroll = window.scrollY;
      for (const p of petals) {
        const y = (((p.y - scroll * 0.12 * p.z) % (h + 80)) + h + 80) % (h + 80) - 40;
        ctx.globalAlpha = p.alpha;
        ctx.save();
        ctx.translate(p.x, y);
        ctx.rotate(p.rot);
        ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    let last = performance.now();
    let running = false;
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = now - last;
      if (dt < 33) return;
      last = now;
      const s = Math.min(dt, 100) / 1000;
      for (const p of petals) {
        p.sway += s * (0.6 + p.z * 0.5);
        p.x += (p.vx * 0.5 + Math.sin(p.sway) * 14 * p.z) * s;
        p.y += p.vy * 0.55 * s;
        p.rot += p.vr * s;
        if (finePointer) {
          const dx = p.x - pointer.x;
          const dy = p.y - window.scrollY * 0.12 * p.z - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < 110 && d > 0.1) {
            const push = (1 - d / 110) * 60 * s * p.z;
            p.x += (dx / d) * push;
            p.y += (dy / d) * push;
          }
        }
        if (p.y > h + 60 + window.scrollY || p.x > w + 60) Object.assign(p, spawn(false), { y: -40 + window.scrollY * 0.12 * p.z });
      }
      draw();
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    draw();
    start();

    const onVisibility = () => (document.hidden ? stop() : start());
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const onResize = () => {
      resize();
      draw();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    if (finePointer) window.addEventListener("pointermove", onMove, { passive: true });
    const offBloom = onBloom((e) => {
      if (e.type === "emergency-start") {
        stop();
        canvas.style.visibility = "hidden";
      } else if (e.type === "emergency-end") {
        canvas.style.visibility = "visible";
        start();
      }
    });

    return () => {
      stop();
      offBloom();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [hydrated, enabled]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-[1] h-dvh w-screen discreet:hidden" />;
}
