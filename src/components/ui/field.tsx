import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => <LabelPrimitive.Root ref={ref} className={cn("text-sm font-medium", className)} {...props} />,
);
Label.displayName = "Label";

/** Errors never rely on colour alone: icon + text, linked via aria-describedby. */
export function FieldError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <span id={id} role="alert" className="flex items-center gap-1.5 text-[13px] font-medium text-destructive">
      <CircleAlert size={14} aria-hidden />
      {children}
    </span>
  );
}

interface FieldProps {
  label: React.ReactNode;
  htmlFor: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <span className="text-[13px] text-muted-foreground">{hint}</span> : null}
      <FieldError id={`${htmlFor}-error`}>{error}</FieldError>
    </div>
  );
}

/** Props to spread on an input so it's linked to its Field's error. */
export function errProps(id: string, error?: string) {
  return { id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${id}-error` : undefined } as const;
}
