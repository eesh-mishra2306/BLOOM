import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ title, body, action, className }: { title: string; body: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-dashed border-line px-6 py-8 text-center", className)}>
      <p className="font-display text-xl text-heading">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-muted">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
