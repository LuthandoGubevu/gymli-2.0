"use client";
import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

// 46×28 track, 22px knob sliding 180ms (design spec).
export const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "relative inline-flex h-7 w-[46px] shrink-0 cursor-pointer items-center rounded-full bg-muted transition-colors [transition-duration:180ms] ease-out data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-[22px] w-[22px] translate-x-[3px] rounded-full bg-muted-foreground transition-[transform,background-color] [transition-duration:180ms] ease-out data-[state=checked]:translate-x-[21px] data-[state=checked]:bg-primary-foreground" />
    </SwitchPrimitive.Root>
  ),
);
Switch.displayName = "Switch";

interface ToggleRowProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}

/** The card-style toggle row used in onboarding and profile settings. */
export function ToggleRow({ id, icon, title, description, checked, onCheckedChange, disabled }: ToggleRowProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3.5 rounded-lg border border-border bg-card p-[18px] text-left">
      <span className="text-accent-ink" aria-hidden>{icon}</span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-[13px] text-muted-foreground">{description}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </label>
  );
}
