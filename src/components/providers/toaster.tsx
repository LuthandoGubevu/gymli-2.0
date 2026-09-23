"use client";
import { CalendarCheck, Check, CircleAlert, Heart, Hourglass, MapPin, Megaphone, Sparkles, X } from "lucide-react";
import { useToast, type ToastIcon, type ToastTone } from "@/lib/toast";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastIcon, typeof Check> = { check: Check, "map-pin": MapPin, x: X, hourglass: Hourglass, heart: Heart, megaphone: Megaphone, sparkles: Sparkles, alert: CircleAlert, calendar: CalendarCheck };
const TONES: Record<ToastTone, string> = { success: "text-success", warning: "text-warning", accent: "text-accent-ink", muted: "text-muted-foreground", destructive: "text-destructive" };

/** Elevated pill at bottom centre; sits 92px up on mobile to clear the tab bar. */
export function Toaster({ raised }: { raised?: boolean }) {
  const t = useToast();
  return (
    <div aria-live="polite" role="status" className="pointer-events-none">
      {t ? (
        <div
          key={t.id}
          className={cn(
            "fixed left-1/2 z-[90] flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2.5 rounded-lg border border-border bg-elevated px-4 py-3 text-sm font-medium shadow-[0_12px_40px_-12px_hsl(222_47%_3%/.6)] animate-gy-toast",
            raised ? "bottom-[92px] min-[820px]:bottom-7" : "bottom-7",
          )}
        >
          {(() => { const I = ICONS[t.icon]; return <I size={18} className={cn("flex-none", TONES[t.tone])} aria-hidden />; })()}
          {t.text}
        </div>
      ) : null}
    </div>
  );
}
