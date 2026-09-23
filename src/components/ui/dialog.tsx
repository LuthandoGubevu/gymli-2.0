"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string; description?: string }
>(({ className, children, title, description, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-scrim backdrop-blur-[6px] animate-gy-fade" />
    <div className="pointer-events-none fixed inset-0 z-[61] flex items-center justify-center p-4">
      <DialogPrimitive.Content
        ref={ref}
        className={cn("pointer-events-auto flex max-h-full w-full max-w-[440px] flex-col gap-[18px] overflow-y-auto rounded-xl border border-border bg-elevated p-6 animate-gy-pop focus:outline-none", className)}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="font-display text-[22px] font-bold leading-tight">{title}</DialogPrimitive.Title>
            {description ? <DialogPrimitive.Description className="text-sm text-muted-foreground">{description}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
          </div>
          <DialogPrimitive.Close className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:text-foreground" aria-label="Close">
            <X size={20} />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </div>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";
