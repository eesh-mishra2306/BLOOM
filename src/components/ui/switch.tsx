"use client";
import { Switch as RadixSwitch } from "radix-ui";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SwitchRowProps = {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/** A labelled switch row: the whole row explains what turning it on does. */
export function SwitchRow({ label, description, checked, onCheckedChange, disabled, className }: SwitchRowProps) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4 py-3", className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="font-semibold text-heading">
          {label}
        </label>
        {description ? (
          <p id={`${id}-d`} className="mt-0.5 text-sm text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-d` : undefined}
        className="relative mt-0.5 inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full border border-line bg-surface-strong transition-colors data-[state=checked]:border-transparent data-[state=checked]:bg-accent disabled:opacity-50"
      >
        <RadixSwitch.Thumb className="block size-6 translate-x-1 rounded-full bg-white shadow-md transition-transform duration-200 ease-[var(--ease-bounce)] data-[state=checked]:translate-x-[1.4rem]" />
      </RadixSwitch.Root>
    </div>
  );
}
