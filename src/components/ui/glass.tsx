import type { ComponentProps, ElementType } from "react";
import { cn } from "@/lib/utils";

type GlassProps<T extends ElementType> = {
  as?: T;
  /** 1 = hero surface (frosted petal), 2 = standard card (no blur), 3 = inset tint */
  tier?: 1 | 2 | 3;
  petal?: boolean;
} & Omit<ComponentProps<T>, "as">;

export function Glass<T extends ElementType = "div">({ as, tier = 2, petal, className, ...props }: GlassProps<T>) {
  const Comp = (as ?? "div") as ElementType;
  return (
    <Comp
      className={cn(
        tier === 1 && "glass p-6",
        tier === 2 && "glass-lite p-5",
        tier === 3 && "bg-accent-soft p-4",
        petal ? "petal" : tier === 3 ? "rounded-[var(--radius-field)]" : "rounded-[var(--radius-card)]",
        className,
      )}
      {...props}
    />
  );
}
