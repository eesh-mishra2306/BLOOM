"use client";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type ChipToggleProps = Omit<ComponentProps<"button">, "onChange"> & { pressed: boolean; onPressedChange: (pressed: boolean) => void };

export function ChipToggle({ pressed, onPressedChange, className, children, ...props }: ChipToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
        pressed ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface-strong text-heading hover:border-accent/40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
