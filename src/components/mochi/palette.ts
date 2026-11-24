/** Fur palettes shared by the 3D rig and the flat fallback. */
export const COMPANION_COLORS = {
  cream: { fur: "#fff1e4", shade: "#f6d9c4", inner: "#ffb8d0", label: "Cream" },
  peach: { fur: "#ffd9c2", shade: "#f5b99a", inner: "#ff8fb4", label: "Peach" },
  blush: { fur: "#ffd6e5", shade: "#f7b3cc", inner: "#ff6f9f", label: "Blush" },
  lilac: { fur: "#eadcf8", shade: "#cdb6ea", inner: "#ffb8d0", label: "Lilac" },
  cocoa: { fur: "#c99a7e", shade: "#a87a60", inner: "#ffb8d0", label: "Cocoa" },
  snow: { fur: "#fbfaf8", shade: "#e4e0dc", inner: "#ffc2d6", label: "Snow" },
} as const;

export type CompanionColor = keyof typeof COMPANION_COLORS;
export type Species = "kitten" | "puppy" | "bunny" | "bear";

export const SPECIES: { value: Species; label: string; blurb: string }[] = [
  { value: "kitten", label: "Kitten", blurb: "Curious and cuddly" },
  { value: "puppy", label: "Puppy", blurb: "Loyal and cheerful" },
  { value: "bunny", label: "Bunny", blurb: "Gentle and playful" },
  { value: "bear", label: "Bear cub", blurb: "Calm and cosy" },
];

export function furFor(color: string) {
  return COMPANION_COLORS[(color in COMPANION_COLORS ? color : "cream") as CompanionColor];
}
