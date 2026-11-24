/**
 * Procedural flower and island shapes for Bloomverse. Each species is one merged geometry with
 * vertex colours, drawn with a single instanced mesh — five draw calls for the whole garden.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Scene, Species } from "@/lib/garden/growth";

function paint(geo: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.getAttribute("uv")) g.deleteAttribute("uv");
  const c = new THREE.Color(color);
  const n = g.getAttribute("position").count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

const STEM = "#5FB872";
const LEAF = "#7FCB8A";

function stem(h: number) {
  const g = new THREE.CylinderGeometry(0.011, 0.016, h, 6, 1);
  g.translate(0, h / 2, 0);
  return paint(g, STEM);
}

function leaf(y: number, turn: number, size = 1, upright = 0.55) {
  const g = new THREE.SphereGeometry(0.05 * size, 8, 6);
  g.scale(1, 0.2, 0.42);
  g.translate(0.045 * size, 0, 0);
  g.rotateZ(upright);
  g.rotateY(turn);
  g.translate(0, y, 0);
  return paint(g, LEAF);
}

function lavender() {
  const h = 0.44;
  const parts = [stem(h), leaf(0.08, 0.4, 0.8), leaf(0.12, 3.4, 0.7)];
  for (let i = 0; i < 11; i++) {
    const b = new THREE.SphereGeometry(0.019, 6, 5);
    b.scale(1, 1.35, 1);
    const a = i * 2.4;
    b.translate(Math.cos(a) * 0.012, 0.27 + i * 0.016, Math.sin(a) * 0.012);
    parts.push(paint(b, i % 2 ? "#9B7FDB" : "#B9A2E8"));
  }
  return parts;
}

function daisy() {
  const h = 0.3;
  const parts = [stem(h), leaf(0.07, 1.2)];
  const center = new THREE.SphereGeometry(0.032, 10, 8);
  center.scale(1, 0.55, 1);
  center.translate(0, h + 0.006, 0);
  parts.push(paint(center, "#FFC94A"));
  for (let i = 0; i < 11; i++) {
    const p = new THREE.SphereGeometry(0.028, 8, 5);
    p.scale(2.1, 0.28, 0.75);
    p.rotateZ(0.2);
    p.translate(0.062, 0, 0);
    p.rotateY((i / 11) * Math.PI * 2);
    p.translate(0, h, 0);
    parts.push(paint(p, "#FFF7FA"));
  }
  return parts;
}

function rose() {
  const h = 0.33;
  const parts = [stem(h), leaf(0.1, 0.3), leaf(0.16, 3.0, 0.9)];
  const bud = new THREE.SphereGeometry(0.03, 8, 6);
  bud.scale(1, 1.15, 1);
  bud.translate(0, h + 0.035, 0);
  parts.push(paint(bud, "#C9285A"));
  const ring = (count: number, radius: number, size: number, open: number, lift: number, color: string, offset: number) => {
    for (let i = 0; i < count; i++) {
      const p = new THREE.SphereGeometry(size, 8, 6);
      p.scale(1, 1.05, 0.4);
      p.rotateX(open);
      p.translate(0, lift, radius);
      p.rotateY((i / count) * Math.PI * 2 + offset);
      p.translate(0, h, 0);
      parts.push(paint(p, color));
    }
  };
  ring(5, 0.026, 0.038, 0.18, 0.035, "#E83F65", 0);
  ring(7, 0.046, 0.048, 0.55, 0.024, "#FF5C8F", 0.4);
  return parts;
}

function tulip() {
  const h = 0.36;
  const parts = [stem(h)];
  const blade = new THREE.SphereGeometry(0.05, 8, 6);
  blade.scale(0.55, 2.6, 0.16);
  blade.rotateZ(0.28);
  blade.translate(0.03, 0.13, 0);
  parts.push(paint(blade, LEAF));
  const profile = [
    [0, 0],
    [0.028, 0.004],
    [0.046, 0.025],
    [0.052, 0.055],
    [0.047, 0.086],
    [0.036, 0.106],
    [0.022, 0.114],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.LatheGeometry(profile, 14);
  cup.translate(0, h - 0.012, 0);
  parts.push(paint(cup, "#FF667A"));
  return parts;
}

function marigold() {
  const h = 0.28;
  const parts = [stem(h), leaf(0.08, 2.2), leaf(0.13, 5.1, 0.85)];
  const colors = ["#FFA62B", "#FFBE4F", "#FF9419"];
  for (let i = 0; i < 18; i++) {
    const phi = Math.acos(1 - (i + 0.5) / 18);
    const theta = i * 2.39996;
    const b = new THREE.SphereGeometry(0.021, 6, 5);
    b.translate(Math.sin(phi) * Math.cos(theta) * 0.038, h + Math.cos(phi) * 0.038, Math.sin(phi) * Math.sin(theta) * 0.038);
    parts.push(paint(b, colors[i % 3]));
  }
  return parts;
}

const BUILD: Record<Species, () => THREE.BufferGeometry[]> = { lavender, daisy, rose, tulip, marigold };
const cache = new Map<Species, THREE.BufferGeometry>();

export function flowerGeometry(species: Species): THREE.BufferGeometry {
  let g = cache.get(species);
  if (!g) {
    g = mergeGeometries(BUILD[species]())!;
    g.computeBoundingSphere();
    cache.set(species, g);
  }
  return g;
}

/** A small tuft of grass blades. */
export function tuftGeometry(): THREE.BufferGeometry {
  const parts = [0, 2.1, 4.2].map((turn, i) => {
    const blade = new THREE.ConeGeometry(0.018, 0.12 + i * 0.03, 4, 1);
    blade.translate(0, (0.12 + i * 0.03) / 2, 0);
    blade.rotateZ(0.25);
    blade.rotateY(turn);
    return paint(blade, i === 1 ? "#73C17F" : "#8ED196");
  });
  return mergeGeometries(parts)!;
}

/** A pink lotus for the pond. */
export function lotusGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const ring = (count: number, size: number, open: number, color: string, offset: number) => {
    for (let i = 0; i < count; i++) {
      const p = new THREE.SphereGeometry(size, 8, 6);
      p.scale(0.6, 1.2, 0.3);
      p.rotateX(open);
      p.translate(0, size * 0.9, size * 0.7);
      p.rotateY((i / count) * Math.PI * 2 + offset);
      parts.push(paint(p, color));
    }
  };
  ring(8, 0.08, 1.0, "#FFB8D0", 0);
  ring(6, 0.065, 0.55, "#FF8FB5", 0.3);
  const c = new THREE.SphereGeometry(0.04, 10, 8);
  c.scale(1, 0.6, 1);
  c.translate(0, 0.05, 0);
  parts.push(paint(c, "#FFD66B"));
  return mergeGeometries(parts)!;
}

/** The rocky underside of the floating island, gently irregular. */
export function islandBase(radius: number, depth: number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(radius, depth, 40, 4);
  g.rotateX(Math.PI);
  const pos = g.getAttribute("position");
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (depth / 2 - v.y) / depth; // 0 at the top rim, 1 at the tip
    if (t > 0.02 && t < 0.98) {
      const n = Math.sin(v.x * 3.1 + v.z * 1.7) * 0.5 + Math.sin(v.z * 4.3 - v.x * 2.2) * 0.5;
      v.x *= 1 + n * 0.08;
      v.z *= 1 + n * 0.08;
      v.y += n * 0.08;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export interface SceneLook {
  label: string;
  /** The sun or moon painted in the backdrop. */
  orb: { x: string; y: string; color: string; size: number };
  top: string;
  bottom: string;
  fog: string;
  skyLight: string;
  groundLight: string;
  hemi: number;
  sun: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  grass: string;
  clay: string;
  water: string;
  fireflies: boolean;
  stars: boolean;
}

export const SCENES: Record<Scene, SceneLook> = {
  dawn: {
    label: "Dawn",
    orb: { x: "80%", y: "16%", color: "255 236 214", size: 46 },
    top: "#FFC2D8",
    bottom: "#FFF2E9",
    fog: "#FFE7EE",
    skyLight: "#FFF4F7",
    groundLight: "#EAD7F3",
    hemi: 1.5,
    sun: "#FFE1CF",
    sunIntensity: 1.3,
    sunPosition: [6, 4, 5],
    grass: "#BFE6BA",
    clay: "#F0C6D5",
    water: "#CFE1FF",
    fireflies: false,
    stars: false,
  },
  golden: {
    label: "Golden",
    orb: { x: "76%", y: "11%", color: "255 241 200", size: 54 },
    top: "#FFCDA6",
    bottom: "#FFF7E3",
    fog: "#FFF0DA",
    skyLight: "#FFF9EF",
    groundLight: "#F3DFCB",
    hemi: 1.55,
    sun: "#FFE8C2",
    sunIntensity: 1.55,
    sunPosition: [5, 7, 3],
    grass: "#C8E9B1",
    clay: "#F3CDBE",
    water: "#C7E3F6",
    fireflies: false,
    stars: false,
  },
  dusk: {
    label: "Dusk",
    orb: { x: "18%", y: "20%", color: "255 214 200", size: 44 },
    top: "#A985CF",
    bottom: "#FFB8D0",
    fog: "#F2BCD6",
    skyLight: "#FFF0FA",
    groundLight: "#C9B4E6",
    hemi: 1.45,
    sun: "#FFC2B0",
    sunIntensity: 1.05,
    sunPosition: [-5, 4, 4],
    grass: "#B8E6C4",
    clay: "#D9A9C6",
    water: "#C8C3F2",
    fireflies: true,
    stars: false,
  },
  moon: {
    label: "Moonlight",
    orb: { x: "78%", y: "13%", color: "246 240 255", size: 34 },
    top: "#1C0C14",
    bottom: "#4B2542",
    fog: "#3A1C33",
    skyLight: "#BDB0EC",
    groundLight: "#2B1526",
    hemi: 0.95,
    sun: "#CBD5FF",
    sunIntensity: 0.75,
    sunPosition: [-4, 6, -2],
    grass: "#86B897",
    clay: "#8E5F80",
    water: "#7D7BB8",
    fireflies: true,
    stars: true,
  },
};

/** The sky behind the 3D garden: a soft gradient with the sun or moon, drawn in CSS. */
export function backdrop(scene: Scene): string {
  const l = SCENES[scene];
  const { x, y, color, size } = l.orb;
  return [
    `radial-gradient(circle at ${x} ${y}, rgb(${color}) 0 ${size / 2}px, rgb(${color} / 0.45) ${size / 2 + 1}px, rgb(${color} / 0) ${size * 2.2}px)`,
    `linear-gradient(180deg, ${l.top} 0%, ${l.bottom} 78%)`,
  ].join(", ");
}
