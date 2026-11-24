"use client";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/** Bottom sheet on phones, centred panel on wider screens. Focus is trapped while open. */
export function Sheet({ open, onOpenChange, title, description, children, className }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-berry/30 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_160ms_ease-out] dark:bg-black/50" />
        <Dialog.Content
          className={cn(
            "glass fixed inset-x-0 bottom-0 z-[71] max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl focus:outline-none",
            "data-[state=open]:animate-[sheet-up_260ms_var(--ease-petal)]",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(36rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-petal)] sm:data-[state=open]:animate-[fade-in_180ms_ease-out]",
            "!bg-surface-strong",
            className,
          )}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line sm:hidden" aria-hidden />
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-2xl text-heading">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1 text-muted">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close className="grid size-11 shrink-0 place-items-center rounded-full text-heading hover:bg-accent-soft" aria-label="Close">
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
