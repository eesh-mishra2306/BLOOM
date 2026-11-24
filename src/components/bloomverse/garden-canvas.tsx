"use client";
import { ContactShadows, Html, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, type Ref, type RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Expression } from "@/components/mochi/behaviour";
import type { Species as CompanionSpecies } from "@/components/mochi/palette";
import { CompanionRig, type Accessory } from "@/components/mochi/rig";
import { SPECIES, type FlowerSpec, type Scene, type Species } from "@/lib/garden/growth";
import { flowerGeometry, islandBase, lotusGeometry, SCENES, tuftGeometry } from "./shapes";

export const ISLAND_RADIUS = 5;
export const PLANT_RADIUS = 4.55;
export const POND = { x: 2.15, z: 1.55, r: 0.78 };
const TARGET = new THREE.Vector3(0, -0.55, 0);
const FOV = 38;
const MIN_DISTANCE = 8;
const MAX_DISTANCE = 19;

/** Far enough back that the island fits the frame, whatever the screen's shape. */
function homePosition(aspect: number): THREE.Vector3 {
  const halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const fit = (ISLAND_RADIUS * 1.08) / (halfH * Math.min(aspect, 1.6));
  const d = THREE.MathUtils.clamp(fit * 0.78, MIN_DISTANCE + 1, MAX_DISTANCE - 1);
  const lift = THREE.MathUtils.degToRad(24);
  return new THREE.Vector3(0, Math.sin(lift) * d + TARGET.y, Math.cos(lift) * d);
}

export interface GardenControls {
  rotate(by: number): void;
  zoom(factor: number): void;
  reset(): void;
}

type Props = {
  flowers: FlowerSpec[];
  scene: Scene;
  companion: { species: CompanionSpecies; color: string; accessory: Accessory };
  expression: Expression;
  wave: number;
  animate: boolean;
  quality: "high" | "low";
  selectedId: string | null;
  onSelect: (f: FlowerSpec | null) => void;
  onMochiTap: () => void;
  mochiLine: string | null;
  onContextLost: () => void;
  controlsRef: Ref<GardenControls>;
};

/** One sway-in-the-breeze material shared by every flower, and a function that moves the breeze on. */
function useSway() {
  return useMemo(() => {
    const uTime = { value: 0 };
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0, side: THREE.DoubleSide });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float swayH = max(transformed.y, 0.0);
          #ifdef USE_INSTANCING
            float swayPhase = instanceMatrix[3][0] * 1.7 + instanceMatrix[3][2] * 1.3;
          #else
            float swayPhase = 0.0;
          #endif
          float sway = sin(uTime * 1.5 + swayPhase) * 0.045 + sin(uTime * 0.63 + swayPhase * 0.5) * 0.025;
          transformed.x += sway * swayH * swayH * 6.0;
          transformed.z += sway * 0.5 * swayH * swayH * 6.0;`,
        );
    };
    m.customProgramCacheKey = () => "bloom-sway";
    return {
      material: m,
      advance: (delta: number) => {
        uTime.value += delta;
      },
    };
  }, []);
}

const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

function FlowerBed({ species, flowers, material, animate, onPick }: { species: Species; flowers: FlowerSpec[]; material: THREE.Material; animate: boolean; onPick: (f: FlowerSpec) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => flowerGeometry(species), [species]);
  const started = useRef<number | null>(null);
  const done = useRef(!animate);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), c: new THREE.Color(), up: new THREE.Vector3(0, 1, 0) }), []);

  const place = (i: number, grow: number) => {
    const f = flowers[i];
    tmp.p.set(f.x, 0, f.z);
    tmp.q.setFromAxisAngle(tmp.up, f.rotation);
    const k = f.scale * 1.25 * grow;
    tmp.s.set(k, k, k);
    tmp.m.compose(tmp.p, tmp.q, tmp.s);
    ref.current!.setMatrixAt(i, tmp.m);
  };

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    flowers.forEach((f, i) => {
      place(i, done.current ? 1 : 0.0001);
      mesh.setColorAt(i, tmp.c.setScalar(0.9 + f.tint * 0.18));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowers]);

  useFrame(({ clock }) => {
    if (done.current || !ref.current) return;
    started.current ??= clock.elapsedTime;
    const t = clock.elapsedTime - started.current;
    let finished = true;
    flowers.forEach((_, i) => {
      const local = Math.min(1, Math.max(0, (t - Math.min(1.6, i * 0.02)) / 0.9));
      if (local < 1) finished = false;
      place(i, Math.max(0.0001, easeOutBack(local)));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    done.current = finished;
  });

  if (!flowers.length) return null;
  return (
    <instancedMesh
      key={flowers.length}
      ref={ref}
      args={[geometry, material, flowers.length]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.instanceId !== undefined) onPick(flowers[e.instanceId]);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    />
  );
}

function Tufts({ count, color }: { count: number; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => tuftGeometry(), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), []);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    let placed = 0;
    while (placed < count) {
      const a = rand() * Math.PI * 2;
      const r = ISLAND_RADIUS * 0.97 * Math.sqrt(rand());
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x, z) < 0.8 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.05) continue;
      const s = 0.7 + rand() * 0.8;
      m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28), new THREE.Vector3(s, s, s));
      mesh.setMatrixAt(placed, m);
      mesh.setColorAt(placed, c.set(color).multiplyScalar(0.85 + rand() * 0.3));
      placed++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, color]);
  return <instancedMesh ref={ref} args={[geometry, material, count]} />;
}

function Island({ grass, clay, water }: { grass: string; clay: string; water: string }) {
  const base = useMemo(() => islandBase(ISLAND_RADIUS * 0.93, 4.4), []);
  const lotus = useMemo(() => lotusGeometry(), []);
  const lotusMaterial = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }), []);
  return (
    <group>
      {/* Grass on top, earthy sides: groups are side, top, bottom */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS * 0.95, 0.6, 96, 1]} />
        <meshStandardMaterial attach="material-0" color={clay} roughness={1} />
        <meshStandardMaterial attach="material-1" color={grass} roughness={0.95} />
        <meshStandardMaterial attach="material-2" color={clay} roughness={1} />
      </mesh>
      <mesh geometry={base} position={[0, -0.6 - 2.2, 0]}>
        <meshStandardMaterial color={clay} roughness={1} flatShading />
      </mesh>
      {/* Mochi's sitting stone */}
      <mesh position={[0, 0.02, 0]} scale={[1, 0.3, 1]}>
        <sphereGeometry args={[0.62, 32, 16]} />
        <meshStandardMaterial color="#F4E8EF" roughness={0.8} />
      </mesh>
      {/* Stepping stones toward the front */}
      {[
        [0.25, 1.25, 0.16],
        [-0.15, 1.85, 0.13],
        [0.18, 2.45, 0.15],
        [-0.12, 3.05, 0.12],
      ].map(([x, z, r]) => (
        <mesh key={z} position={[x, 0.005, z]} scale={[1, 0.18, 0.8]}>
          <sphereGeometry args={[r * 1.6, 16, 8]} />
          <meshStandardMaterial color="#F1E4EC" roughness={0.85} />
        </mesh>
      ))}
      {/* Pond with lily pads and a lotus */}
      <mesh position={[POND.x, 0.004, POND.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[POND.r, 48]} />
        <meshStandardMaterial color={water} roughness={0.15} metalness={0.15} />
      </mesh>
      {[
        [0.3, -0.2, 0.17],
        [-0.28, 0.18, 0.13],
        [0.05, 0.38, 0.11],
      ].map(([dx, dz, r]) => (
        <mesh key={dx} position={[POND.x + dx, 0.012, POND.z + dz]}>
          <cylinderGeometry args={[r, r, 0.012, 20]} />
          <meshStandardMaterial color="#7FC48C" roughness={0.7} />
        </mesh>
      ))}
      <mesh geometry={lotus} material={lotusMaterial} position={[POND.x - 0.12, 0.02, POND.z - 0.05]} />
    </group>
  );
}

function CameraRig({ controlsRef, apiRef, onInteract }: { controlsRef: RefObject<OrbitControlsImpl | null>; apiRef: Ref<GardenControls>; onInteract: () => void }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const moved = useRef(false);

  // Frame the island for this screen, until the person moves the camera themselves.
  useLayoutEffect(() => {
    if (moved.current) return;
    camera.position.copy(homePosition(aspect));
    controlsRef.current?.update();
    invalidate();
  }, [aspect, camera, controlsRef, invalidate]);
  useImperativeHandle(
    apiRef,
    () => ({
      rotate(by) {
        moved.current = true;
        onInteract();
        const offset = camera.position.clone().sub(TARGET);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), by);
        camera.position.copy(TARGET).add(offset);
        controlsRef.current?.update();
        invalidate();
      },
      zoom(factor) {
        moved.current = true;
        onInteract();
        const offset = camera.position.clone().sub(TARGET);
        const len = THREE.MathUtils.clamp(offset.length() * factor, MIN_DISTANCE, MAX_DISTANCE);
        camera.position.copy(TARGET).add(offset.setLength(len));
        controlsRef.current?.update();
        invalidate();
      },
      reset() {
        moved.current = false;
        camera.position.copy(homePosition(aspect));
        controlsRef.current?.target.copy(TARGET);
        controlsRef.current?.update();
        invalidate();
      },
    }),
    [aspect, camera, controlsRef, invalidate, onInteract],
  );
  return null;
}

function Breeze({ advance, animate }: { advance: (delta: number) => void; animate: boolean }) {
  useFrame((_, delta) => {
    if (animate) advance(delta);
  });
  return null;
}

export default function GardenCanvas(props: Props) {
  const { flowers, scene, companion, expression, wave, animate, quality, selectedId, onSelect, onMochiTap, mochiLine, onContextLost, controlsRef } = props;
  const look = SCENES[scene];
  const { material, advance } = useSway();
  const orbit = useRef<OrbitControlsImpl | null>(null);
  const autoRotate = useRef(animate);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const bySpecies = useMemo(() => {
    const groups: Record<Species, FlowerSpec[]> = { lavender: [], daisy: [], rose: [], tulip: [], marigold: [] };
    for (const f of flowers) groups[f.species].push(f);
    return groups;
  }, [flowers]);
  const selected = flowers.find((f) => f.id === selectedId) ?? null;

  useEffect(() => {
    if (orbit.current) orbit.current.autoRotate = animate && autoRotate.current;
  }, [animate]);

  const stopAutoRotate = () => {
    autoRotate.current = false;
    if (orbit.current) orbit.current.autoRotate = false;
  };

  return (
    <Canvas
      frameloop={animate ? "always" : "demand"}
      flat
      dpr={[1, quality === "high" ? 1.75 : 1.25]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: homePosition(1).toArray(), fov: FOV, near: 0.1, far: 140 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onContextLost();
        });
      }}
      onPointerMissed={() => onSelect(null)}
      onPointerMove={(e) => {
        const r = (e.target as HTMLElement).getBoundingClientRect?.();
        if (r) pointer.current = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 };
      }}
    >
      <Breeze advance={advance} animate={animate} />
      <fog attach="fog" args={[look.fog, 20, 44]} />
      <hemisphereLight args={[look.skyLight, look.groundLight, look.hemi]} />
      <directionalLight position={look.sunPosition} intensity={look.sunIntensity} color={look.sun} />
      <ambientLight intensity={0.2} />
      {look.stars ? <Stars radius={50} depth={20} count={quality === "high" ? 1400 : 700} factor={2.6} saturation={0} fade speed={animate ? 0.4 : 0} /> : null}

      <Island grass={look.grass} clay={look.clay} water={look.water} />
      <Tufts count={quality === "high" ? 320 : 160} color={look.grass} />
      {(Object.keys(bySpecies) as Species[]).map((s) => (
        <FlowerBed key={s} species={s} flowers={bySpecies[s]} material={material} animate={animate} onPick={onSelect} />
      ))}

      <group
        position={[0, 0.62, 0]}
        scale={0.5}
        onClick={(e) => {
          e.stopPropagation();
          onMochiTap();
        }}
      >
        <CompanionRig species={companion.species} color={companion.color} accessory={companion.accessory} expression={expression} bounce={0} wave={wave} quality={quality} calm lookAt={pointer} />
      </group>
      <ContactShadows position={[0, 0.2, 0]} scale={2.2} blur={2.2} opacity={0.3} far={1.2} frames={1} />
      {mochiLine ? (
        <Html position={[0, 1.75, 0]} center zIndexRange={[20, 0]}>
          <p className="w-56 rounded-2xl bg-surface-strong px-3 py-2 text-center text-sm font-semibold text-heading shadow-lg">{mochiLine}</p>
        </Html>
      ) : null}

      {selected ? (
        <>
          <mesh position={[selected.x, 0.008, selected.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.14, 0.18, 32]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
          </mesh>
          <Html position={[selected.x, 0.72, selected.z]} center zIndexRange={[20, 0]}>
            <p className="pointer-events-none w-max max-w-48 rounded-2xl bg-surface-strong px-3 py-1.5 text-center text-sm text-heading shadow-lg">
              <span className="font-semibold">{SPECIES[selected.kind].name}</span>
              <span className="block text-xs text-muted">
                From {SPECIES[selected.kind].from}, {new Date(selected.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </p>
          </Html>
        </>
      ) : null}

      <Sparkles
        count={quality === "high" ? 70 : 35}
        scale={[9, 2.4, 9]}
        position={[0, 1.2, 0]}
        size={look.fireflies ? 3.4 : 2.2}
        speed={animate ? 0.3 : 0}
        color={look.fireflies ? "#FFF0A8" : "#FFFFFF"}
        opacity={look.fireflies ? 0.95 : 0.7}
      />
      <OrbitControls
        ref={orbit}
        enablePan={false}
        enableDamping
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
        minPolarAngle={0.45}
        maxPolarAngle={1.42}
        autoRotate={animate}
        autoRotateSpeed={0.35}
        target={TARGET.toArray()}
        onStart={stopAutoRotate}
      />
      <CameraRig controlsRef={orbit} apiRef={controlsRef} onInteract={stopAutoRotate} />
    </Canvas>
  );
}
