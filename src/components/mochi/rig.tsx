"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { Expression } from "./behaviour";
import { furFor, type Species } from "./palette";

/**
 * Mochi, built from primitives so there are no model files to license or download.
 * Every motion is procedural: breathing, blinking, ear twitches, tail wag, look-at,
 * hops, waves and a face for each expression. One rig, four species.
 */

export type Accessory = "none" | "flower" | "bow";
export type Quality = "high" | "low";

type Targets = { eyeOpen: number; eyes: "round" | "happy" | "closed"; cheek: number; tilt: number; ears: number; tail: number; bob: number; mouth: "w" | "open" | "talk"; lookUp: number };

const TARGETS: Record<Expression, Targets> = {
  idle: { eyeOpen: 1, eyes: "round", cheek: 0.42, tilt: 0, ears: 0, tail: 1.6, bob: 1, mouth: "w", lookUp: 0 },
  happy: { eyeOpen: 1, eyes: "happy", cheek: 0.85, tilt: 0.1, ears: -0.12, tail: 5, bob: 1.6, mouth: "open", lookUp: 0 },
  curious: { eyeOpen: 1.12, eyes: "round", cheek: 0.45, tilt: 0.26, ears: -0.18, tail: 2.2, bob: 1, mouth: "w", lookUp: 0.05 },
  sleepy: { eyeOpen: 0.42, eyes: "round", cheek: 0.5, tilt: -0.06, ears: 0.14, tail: 0.6, bob: 0.6, mouth: "w", lookUp: -0.05 },
  asleep: { eyeOpen: 1, eyes: "closed", cheek: 0.55, tilt: 0.14, ears: 0.24, tail: 0.25, bob: 0.45, mouth: "w", lookUp: -0.12 },
  comforting: { eyeOpen: 0.78, eyes: "happy", cheek: 0.72, tilt: 0.2, ears: 0.1, tail: 0.9, bob: 0.7, mouth: "w", lookUp: 0 },
  listening: { eyeOpen: 1.1, eyes: "round", cheek: 0.45, tilt: -0.08, ears: -0.22, tail: 1.2, bob: 0.8, mouth: "w", lookUp: 0 },
  thinking: { eyeOpen: 0.95, eyes: "round", cheek: 0.4, tilt: 0.16, ears: -0.05, tail: 1, bob: 0.7, mouth: "w", lookUp: 0.18 },
  talking: { eyeOpen: 1, eyes: "round", cheek: 0.55, tilt: 0.04, ears: -0.08, tail: 2.4, bob: 1.1, mouth: "talk", lookUp: 0 },
};

const damp = THREE.MathUtils.damp;

type RigProps = {
  species: Species;
  color: string;
  accessory?: Accessory;
  expression: Expression;
  bounce: number;
  wave?: number;
  quality: Quality;
  calm?: boolean;
  /** Normalised pointer position (-1..1) the head turns toward; null to look ahead. */
  lookAt?: RefObject<{ x: number; y: number } | null>;
};

export function CompanionRig({ species, color, accessory = "none", expression, bounce, wave = 0, quality, calm = false, lookAt }: RigProps) {
  const palette = furFor(color);
  const seg = quality === "high" ? 40 : 22;

  const mats = useMemo(() => {
    const furOpts = { color: palette.fur, roughness: 0.85 };
    const fur =
      quality === "high"
        ? new THREE.MeshPhysicalMaterial({ ...furOpts, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color("#ffffff") })
        : new THREE.MeshStandardMaterial(furOpts);
    const light = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.fur).lerp(new THREE.Color("#ffffff"), 0.55), roughness: 0.9 });
    const shade = new THREE.MeshStandardMaterial({ color: palette.shade, roughness: 0.9 });
    const inner = new THREE.MeshStandardMaterial({ color: palette.inner, roughness: 0.75 });
    const eye = new THREE.MeshStandardMaterial({ color: "#2a1220", roughness: 0.18, metalness: 0.05 });
    const shine = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const nose = new THREE.MeshStandardMaterial({ color: "#e8517a", roughness: 0.4 });
    const mouth = new THREE.MeshStandardMaterial({ color: "#7a2440", roughness: 0.6 });
    const cheek = new THREE.MeshBasicMaterial({ color: "#ff7aa8", transparent: true, opacity: 0.45, depthWrite: false });
    const line = new THREE.MeshBasicMaterial({ color: palette.shade });
    const petal = new THREE.MeshStandardMaterial({ color: "#ff4f91", roughness: 0.6 });
    const petalCenter = new THREE.MeshStandardMaterial({ color: "#ffd36b", roughness: 0.6 });
    return { fur, light, shade, inner, eye, shine, nose, mouth, cheek, line, petal, petalCenter };
  }, [palette.fur, palette.shade, palette.inner, quality]);

  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Group>(null);
  const earL = useRef<THREE.Group>(null);
  const earR = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Group>(null);
  const eyeR = useRef<THREE.Group>(null);
  const roundL = useRef<THREE.Group>(null);
  const roundR = useRef<THREE.Group>(null);
  const arcL = useRef<THREE.Mesh>(null);
  const arcR = useRef<THREE.Mesh>(null);
  const mouthW = useRef<THREE.Group>(null);
  const mouthOpen = useRef<THREE.Mesh>(null);
  const arm = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const cheek = useRef<THREE.Mesh>(null);

  const sim = useRef({ blinkAt: 2, blink: 0, twitchAt: 5, twitchSide: 1, twitch: 0, hopV: 0, hopY: 0, lastBounce: bounce, waveStart: -10, lastWave: wave, eyeOpen: 1, cheek: 0.45, tilt: 0, ears: 0, lookX: 0, lookY: 0 });

  const tailCount = species === "kitten" ? 14 : species === "puppy" ? 6 : 1;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    const s = sim.current;
    const goal = TARGETS[expression];
    const amp = calm ? 0.35 : 1;

    // Hop when `bounce` increments (springy, with squash on landing)
    if (bounce !== s.lastBounce) {
      s.lastBounce = bounce;
      if (!calm) s.hopV = 2.3;
    }
    s.hopV += (-28 * s.hopY - 5 * s.hopV) * dt;
    s.hopY = Math.max(-0.04, s.hopY + s.hopV * dt);
    if (wave !== s.lastWave) {
      s.lastWave = wave;
      s.waveStart = t;
    }

    // Breathing and idle bob
    const breathe = Math.sin(t * (expression === "asleep" ? 1.1 : 1.8)) * 0.018 * goal.bob * amp;
    if (root.current) {
      root.current.position.y = s.hopY * 0.55 + Math.sin(t * 1.3) * 0.012 * goal.bob * amp;
      const squash = THREE.MathUtils.clamp(-s.hopV * 0.025, -0.06, 0.06);
      root.current.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
    }
    if (body.current) body.current.scale.set(1 + breathe * 0.6, 0.88 + breathe, 0.9 + breathe * 0.6);

    // Blink every few seconds (not while eyes are closed or happy)
    if (t > s.blinkAt) {
      s.blink = 1;
      s.blinkAt = t + 2.4 + Math.random() * 3.6;
    }
    s.blink = Math.max(0, s.blink - dt * 7);
    const blinkFactor = 1 - Math.sin(s.blink * Math.PI) * 0.92;

    s.eyeOpen = damp(s.eyeOpen, goal.eyeOpen, 8, dt);
    s.cheek = damp(s.cheek, goal.cheek, 6, dt);
    s.tilt = damp(s.tilt, goal.tilt, 5, dt);
    s.ears = damp(s.ears, goal.ears, 7, dt);

    const showRound = goal.eyes === "round";
    for (const [roundRef, arcRef] of [
      [roundL, arcL],
      [roundR, arcR],
    ] as const) {
      if (roundRef.current) {
        roundRef.current.visible = showRound;
        roundRef.current.scale.set(1, Math.max(0.08, s.eyeOpen * blinkFactor), 1);
      }
      if (arcRef.current) {
        arcRef.current.visible = !showRound;
        arcRef.current.rotation.z = goal.eyes === "happy" ? 0 : Math.PI;
      }
    }
    // Pupils drift up when thinking
    for (const e of [eyeL, eyeR]) if (e.current) e.current.position.y = 0.05 + goal.lookUp * 0.25;
    // Both cheeks share one material, so setting it through either mesh blushes both.
    const blush = cheek.current?.material as THREE.MeshBasicMaterial | undefined;
    if (blush) blush.opacity = s.cheek;

    // Head: look toward the pointer, tilt with mood
    const target = lookAt?.current;
    const allowLook = !calm && expression !== "asleep" && expression !== "sleepy";
    s.lookX = damp(s.lookX, allowLook && target ? THREE.MathUtils.clamp(target.x, -1, 1) * 0.5 : 0, 4, dt);
    s.lookY = damp(s.lookY, allowLook && target ? THREE.MathUtils.clamp(target.y, -1, 1) * 0.28 : 0, 4, dt);
    if (head.current) {
      head.current.rotation.y = s.lookX + Math.sin(t * 0.7) * 0.04 * amp;
      head.current.rotation.x = -s.lookY + goal.lookUp * -0.6 + (expression === "asleep" ? 0.16 : 0);
      head.current.rotation.z = s.tilt + Math.sin(t * 0.9) * 0.015 * amp;
    }

    // Ear twitch now and then
    if (t > s.twitchAt) {
      s.twitch = 1;
      s.twitchSide = Math.random() > 0.5 ? 1 : -1;
      s.twitchAt = t + 3.5 + Math.random() * 6;
    }
    s.twitch = Math.max(0, s.twitch - dt * 5);
    const twitch = Math.sin(s.twitch * Math.PI) * 0.3 * amp;
    if (earL.current) earL.current.rotation.x = s.ears + (s.twitchSide < 0 ? twitch : 0);
    if (earR.current) earR.current.rotation.x = s.ears + (s.twitchSide > 0 ? twitch : 0);

    // Mouth
    if (mouthW.current) mouthW.current.visible = goal.mouth === "w";
    if (mouthOpen.current) {
      mouthOpen.current.visible = goal.mouth !== "w";
      const talk = goal.mouth === "talk" ? 0.45 + Math.abs(Math.sin(t * 11)) * 0.75 : 1;
      mouthOpen.current.scale.set(1, talk, 1);
    }

    // Wave the right paw for ~1.8 s after `wave` increments
    if (arm.current) {
      const w = t - s.waveStart;
      const raise = w < 1.8 && !calm ? Math.sin(Math.min(1, w / 0.3) * Math.PI * 0.5) * (1 - Math.max(0, (w - 1.5) / 0.3)) : 0;
      arm.current.rotation.z = raise * 2.2 + Math.sin(w * 14) * 0.25 * raise;
    }

    // Tail
    if (tail.current) {
      const speed = goal.tail;
      tail.current.children.forEach((child, i) => {
        const k = i / Math.max(1, tailCount - 1);
        const sway = Math.sin(t * speed - i * 0.55) * 0.09 * k * (species === "puppy" ? 1.4 : 1) * amp;
        if (species === "kitten") {
          // A soft S-curve: out to the side, then up, curling at the tip.
          const a = k * Math.PI * 0.85;
          child.position.set(0.32 + Math.sin(a) * 0.34 + sway * 1.4, -0.92 + k * 0.78, -0.42 - Math.cos(a) * 0.08 - k * 0.06);
        } else if (species === "puppy") {
          child.position.set(sway * 2.2, -0.7 + i * 0.06, -0.55 - i * 0.07);
        }
      });
      if (species === "bunny" || species === "bear") tail.current.rotation.z = Math.sin(t * speed) * 0.1 * amp;
    }
  });

  const earGeo = useMemo(() => {
    switch (species) {
      case "kitten":
        return <coneGeometry args={[0.21, 0.4, seg]} />;
      case "bunny":
        return <capsuleGeometry args={[0.105, 0.5, 6, seg]} />;
      case "bear":
        return <sphereGeometry args={[0.17, seg, seg]} />;
      case "puppy":
        return <sphereGeometry args={[0.2, seg, seg]} />;
    }
  }, [species, seg]);

  const earPose = {
    kitten: { pos: [0.4, 0.5, 0] as const, rot: [0, 0, -0.38] as const, scale: [1, 1, 0.75] as const },
    bunny: { pos: [0.22, 0.78, -0.02] as const, rot: [0, 0, -0.16] as const, scale: [1, 1, 0.7] as const },
    bear: { pos: [0.47, 0.45, -0.02] as const, rot: [0, 0, 0] as const, scale: [1, 1, 0.6] as const },
    puppy: { pos: [0.66, 0.08, -0.02] as const, rot: [0, 0, 0.35] as const, scale: [0.62, 1.45, 0.45] as const },
  }[species];

  return (
    <group ref={root} position={[0, 0.05, 0]}>
      {/* soft contact shadow */}
      <mesh position={[0, -1.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.72, 32]} />
        <meshBasicMaterial color="#66263f" transparent opacity={0.1} depthWrite={false} />
      </mesh>

      {/* body + belly */}
      <mesh ref={body} position={[0, -0.5, 0]} material={mats.fur}>
        <sphereGeometry args={[0.6, seg, seg]} />
      </mesh>
      <mesh position={[0, -0.5, 0.3]} scale={[0.9, 0.86, 0.42]} material={mats.light}>
        <sphereGeometry args={[0.38, seg, seg]} />
      </mesh>

      {/* feet */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.28, -1.0, 0.2]} scale={[1, 0.62, 1.3]} material={mats.fur}>
          <sphereGeometry args={[0.16, seg, seg]} />
        </mesh>
      ))}
      {/* left paw resting, right paw on a pivot for waving */}
      <mesh position={[-0.27, -0.82, 0.42]} scale={[1, 0.82, 1]} material={mats.light}>
        <sphereGeometry args={[0.13, seg, seg]} />
      </mesh>
      <group ref={arm} position={[0.33, -0.5, 0.3]}>
        <mesh position={[-0.06, -0.32, 0.12]} scale={[1, 0.82, 1]} material={mats.light}>
          <sphereGeometry args={[0.13, seg, seg]} />
        </mesh>
      </group>

      {/* tail */}
      <group ref={tail} position={species === "bunny" || species === "bear" ? [0, -0.72, -0.52] : [0, 0, 0]}>
        {Array.from({ length: tailCount }, (_, i) => (
          <mesh key={i} material={species === "bunny" ? mats.light : mats.fur}>
            <sphereGeometry
              args={[species === "kitten" ? 0.085 - i * 0.0022 : species === "puppy" ? 0.085 - i * 0.008 : species === "bunny" ? 0.17 : 0.09, seg / 2, seg / 2]}
            />
          </mesh>
        ))}
      </group>

      {/* head */}
      <group ref={head} position={[0, 0.3, 0.04]}>
        <mesh scale={[1.1, 0.93, 0.96]} material={mats.fur}>
          <sphereGeometry args={[0.68, seg, seg]} />
        </mesh>

        {/* ears */}
        {[-1, 1].map((side) => (
          <group key={side} ref={side < 0 ? earL : earR} position={[earPose.pos[0] * side, earPose.pos[1], earPose.pos[2]]}>
            <group rotation={[earPose.rot[0], earPose.rot[1], earPose.rot[2] * side]} scale={earPose.scale}>
              <mesh material={species === "puppy" ? mats.shade : mats.fur}>{earGeo}</mesh>
              {species !== "puppy" ? (
                <mesh position={[0, species === "bear" ? 0 : -0.02, 0.07]} scale={species === "kitten" ? [0.6, 0.62, 0.6] : [0.55, 0.8, 0.6]} material={mats.inner}>
                  {earGeo}
                </mesh>
              ) : null}
            </group>
          </group>
        ))}

        {/* muzzle, nose, mouth */}
        <mesh position={[0, -0.18, 0.56]} scale={[1.3, 0.82, 0.62]} material={mats.light}>
          <sphereGeometry args={[0.17, seg, seg]} />
        </mesh>
        <mesh position={[0, -0.1, 0.68]} scale={[1.35, 0.9, 0.8]} material={mats.nose}>
          <sphereGeometry args={[0.045, 16, 16]} />
        </mesh>
        <group ref={mouthW} position={[0, -0.2, 0.665]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.042, 0, 0]} rotation={[0, 0, Math.PI]} material={mats.mouth}>
              <torusGeometry args={[0.04, 0.011, 8, 16, Math.PI]} />
            </mesh>
          ))}
        </group>
        <mesh ref={mouthOpen} position={[0, -0.22, 0.655]} scale={[1, 1, 1]} visible={false} material={mats.mouth}>
          <sphereGeometry args={[0.052, 16, 16]} />
        </mesh>

        {/* eyes: round (with shine) or arcs for happy / asleep */}
        {[-1, 1].map((side) => (
          <group key={side} ref={side < 0 ? eyeL : eyeR} position={[side * 0.25, 0.05, 0.58]}>
            <group ref={side < 0 ? roundL : roundR}>
              <mesh scale={[0.86, 1.12, 0.55]} material={mats.eye}>
                <sphereGeometry args={[0.115, 24, 24]} />
              </mesh>
              <mesh position={[0.03, 0.045, 0.05]} material={mats.shine}>
                <sphereGeometry args={[0.03, 12, 12]} />
              </mesh>
              <mesh position={[-0.028, -0.035, 0.05]} material={mats.shine}>
                <sphereGeometry args={[0.014, 8, 8]} />
              </mesh>
            </group>
            <mesh ref={side < 0 ? arcL : arcR} visible={false} material={mats.eye}>
              <torusGeometry args={[0.075, 0.018, 8, 20, Math.PI]} />
            </mesh>
          </group>
        ))}

        {/* cheeks */}
        {[-1, 1].map((side) => (
          <mesh key={side} ref={side === 1 ? cheek : undefined} position={[side * 0.43, -0.12, 0.5]} rotation={[0, side * 0.62, 0]} material={mats.cheek}>
            <circleGeometry args={[0.115, 24]} />
          </mesh>
        ))}

        {/* whiskers (kitten) */}
        {species === "kitten"
          ? [-1, 1].flatMap((side) =>
              [0.06, -0.06].map((tiltZ, i) => (
                <mesh key={`${side}-${i}`} position={[side * 0.47, -0.14 - i * 0.05, 0.47]} rotation={[0, side * 0.5, Math.PI / 2 + tiltZ * side]} material={mats.line}>
                  <cylinderGeometry args={[0.005, 0.005, 0.3, 4]} />
                </mesh>
              )),
            )
          : null}

        {/* accessories */}
        {accessory === "flower" ? (
          <group position={[-0.42, 0.42, 0.28]} rotation={[0.3, -0.4, 0.2]} scale={0.9}>
            {[0, 1, 2, 3, 4].map((i) => (
              <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.07, Math.sin((i / 5) * Math.PI * 2) * 0.07, 0]} scale={[1, 1, 0.5]} material={mats.petal}>
                <sphereGeometry args={[0.055, 12, 12]} />
              </mesh>
            ))}
            <mesh position={[0, 0, 0.03]} material={mats.petalCenter}>
              <sphereGeometry args={[0.04, 12, 12]} />
            </mesh>
          </group>
        ) : null}
        {accessory === "bow" ? (
          <group position={[0, -0.55, 0.42]} rotation={[0.25, 0, 0]}>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.085, 0, 0]} rotation={[0, 0, side * 0.5]} scale={[1.2, 0.75, 0.5]} material={mats.petal}>
                <sphereGeometry args={[0.075, 14, 14]} />
              </mesh>
            ))}
            <mesh material={mats.petal}>
              <sphereGeometry args={[0.04, 12, 12]} />
            </mesh>
          </group>
        ) : null}
      </group>
    </group>
  );
}
