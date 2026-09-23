import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Buttons per the design: 8px radius, press = scale(.97), gold hover = brightness 1.06.
// `glow` is reserved for the one main CTA on a screen.
export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans no-underline hover:no-underline transition-[transform,filter,background-color,color,border-color] duration-150 ease-out active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground font-semibold hover:brightness-[1.06] hover:text-primary-foreground",
        outline: "border border-border bg-transparent text-foreground font-medium hover:bg-elevated hover:text-foreground",
        ghost: "bg-transparent text-muted-foreground font-medium hover:text-foreground",
        success: "border soft-success font-semibold",
        warning: "border soft-warning font-semibold",
        destructive: "border soft-destructive font-semibold hover:brightness-110",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-3.5 text-sm",
        lg: "h-11 px-4 text-[15px]",
        xl: "h-12 px-5 text-[15px]",
        hero: "h-[52px] px-[22px] text-base",
        icon: "h-10 w-10 p-0",
        "icon-lg": "h-11 w-11 p-0",
      },
      glow: { true: "shadow-glow", false: "" },
    },
    defaultVariants: { variant: "primary", size: "lg", glow: false },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, glow, asChild, type, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} type={asChild ? undefined : (type ?? "button")} className={cn(buttonVariants({ variant, size, glow }), className)} {...props} />;
});
Button.displayName = "Button";
