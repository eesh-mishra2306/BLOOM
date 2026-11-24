import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-[var(--radius-field)] border border-line bg-surface-strong px-4 text-base text-fg placeholder:text-muted/80 transition-[border-color,box-shadow] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 aria-invalid:border-sos-bg";

type FieldShellProps = { label: ReactNode; hint?: ReactNode; error?: string | null; className?: string; children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode };

export function FieldShell({ label, hint, error, className, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="font-semibold text-heading">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-sos-bg" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputFieldProps = ComponentProps<"input"> & { label: ReactNode; hint?: ReactNode; error?: string | null };

export function InputField({ label, hint, error, className, ...props }: InputFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cn(control, "h-12")} {...props} />
      )}
    </FieldShell>
  );
}

type TextareaFieldProps = ComponentProps<"textarea"> & { label: ReactNode; hint?: ReactNode; error?: string | null };

export function TextareaField({ label, hint, error, className, ...props }: TextareaFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cn(control, "min-h-28 py-3 leading-relaxed")} {...props} />
      )}
    </FieldShell>
  );
}

type SelectFieldProps = ComponentProps<"select"> & { label: ReactNode; hint?: ReactNode; error?: string | null };

export function SelectField({ label, hint, error, className, children, ...props }: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cn(control, "h-12 appearance-none pr-10")} {...props}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}
