"use client";
import * as React from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;

export const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof DM.Content>, React.ComponentPropsWithoutRef<typeof DM.Content>>(
  ({ className, sideOffset = 6, ...props }, ref) => (
    <DM.Portal>
      <DM.Content ref={ref} sideOffset={sideOffset} className={cn("z-[70] min-w-[160px] rounded-lg border border-border bg-elevated p-1 shadow-[0_12px_40px_-12px_hsl(222_47%_3%/.6)] animate-gy-fade", className)} {...props} />
    </DM.Portal>
  ),
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<React.ElementRef<typeof DM.Item>, React.ComponentPropsWithoutRef<typeof DM.Item> & { destructive?: boolean }>(
  ({ className, destructive, ...props }, ref) => (
    <DM.Item ref={ref} className={cn("flex h-10 cursor-pointer select-none items-center gap-2.5 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-card", destructive && "text-destructive", className)} {...props} />
  ),
);
DropdownMenuItem.displayName = "DropdownMenuItem";
