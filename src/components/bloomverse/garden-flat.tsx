import { MochiFlat } from "@/components/mochi/mochi-flat";
import type { Species as CompanionSpecies } from "@/components/mochi/palette";
import type { FlowerSpec, Scene, Species } from "@/lib/garden/growth";
import { backdrop, SCENES } from "./shapes";

const PETAL: Record<Species, string> = { lavender: "#A98BE0", daisy: "#FFFFFF", rose: "#FF5C8F", tulip: "#FF667A", marigold: "#FFA62B" };
const CENTER: Record<Species, string> = { lavender: "#8C6CD3", daisy: "#FFC94A", rose: "#C9285A", tulip: "#E83F65", marigold: "#FF9419" };

/** The garden drawn flat, for devices without WebGL. Same flowers, same places. */
export function GardenFlat({ flowers, scene, companion, pond }: { flowers: FlowerSpec[]; scene: Scene; companion: { species: CompanionSpecies; color: string }; pond: { x: number; z: number; r: number } }) {
  const look = SCENES[scene];
  return (
    <div className="relative size-full" style={{ background: backdrop(scene) }}>
      <svg viewBox="-5.6 -5.6 11.2 11.2" className="absolute inset-0 m-auto size-full max-h-full" aria-hidden>
        <ellipse cx="0" cy="0.35" rx="5.15" ry="5.15" fill={look.clay} opacity="0.8" />
        <circle cx="0" cy="0" r="5" fill={look.grass} />
        <circle cx={pond.x} cy={pond.z} r={pond.r} fill={look.water} />
        <circle cx="0" cy="0" r="0.62" fill="#F4E8EF" />
        {flowers.map((f) => (
          <g key={f.id} transform={`translate(${f.x} ${f.z}) rotate(${(f.rotation * 180) / Math.PI}) scale(${f.scale})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-0.075" rx="0.05" ry="0.085" fill={PETAL[f.species]} transform={`rotate(${a})`} />
            ))}
            <circle r="0.045" fill={CENTER[f.species]} />
          </g>
        ))}
      </svg>
      <div className="absolute top-1/2 left-1/2 size-[18%] min-w-16 -translate-x-1/2 -translate-y-[60%]">
        <MochiFlat species={companion.species} color={companion.color} mood="happy" className="size-full" />
      </div>
    </div>
  );
}
