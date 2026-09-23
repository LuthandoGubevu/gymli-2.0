"use client";
// Global celebration queue. Any hook can `celebrate(payload)`; several at once queue,
// each shown 260ms after the previous is dismissed.
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CalendarCheck, Flame, Heart, Trophy, type LucideIcon } from "lucide-react";
import { BADGE_ICONS } from "@/components/icons";
import type { BadgeIcon } from "@/lib/badges";

export interface Celebration {
  kind: "streak" | "class" | "pr" | "badge" | "match";
  icon?: "flame" | "calendar-check" | "trophy" | BadgeIcon;
  eyebrow: string;
  big?: string;
  unit?: string;
  title: string;
  sub?: string;
  primary: string;
  secondary?: string;
  onPrimary?: () => void;
  match?: { a: string; b: string };
}

const Ctx = React.createContext<(c: Celebration) => void>(() => {});
export const useCelebrate = () => React.useContext(Ctx);

const ICONS: Record<string, LucideIcon> = { ...BADGE_ICONS, flame: Flame, "calendar-check": CalendarCheck, trophy: Trophy };

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = React.useState<Celebration | null>(null);
  const queue = React.useRef<Celebration[]>([]);
  const showing = React.useRef(false);

  const celebrate = React.useCallback((c: Celebration) => {
    if (showing.current) queue.current.push(c);
    else { showing.current = true; setCurrent(c); }
  }, []);

  const dismiss = React.useCallback(() => {
    setCurrent(null);
    const next = queue.current.shift();
    if (next) setTimeout(() => setCurrent(next), 260);
    else showing.current = false;
  }, []);

  const Icon = current?.icon ? ICONS[current.icon] ?? Trophy : Trophy;

  return (
    <Ctx.Provider value={celebrate}>
      {children}
      <DialogPrimitive.Root open={!!current} onOpenChange={(o) => { if (!o) dismiss(); }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-scrim backdrop-blur-[10px] animate-gy-fade" />
          {current ? (
            <div className="pointer-events-none fixed inset-0 z-[81] flex items-center justify-center p-5">
              <DialogPrimitive.Content className="pointer-events-auto flex w-full max-w-[380px] flex-col items-center gap-[18px] rounded-2xl border border-border bg-elevated px-7 pb-7 pt-9 text-center animate-gy-pop-big focus:outline-none" aria-describedby={current.sub ? "cel-sub" : undefined}>
                {current.match ? (
                  <div className="relative flex h-24 items-center" aria-hidden>
                    <div className="grid h-[88px] w-[88px] translate-x-2.5 place-items-center rounded-full border-2 border-primary bg-card font-display text-[28px] font-bold">{current.match.a}</div>
                    <div className="glow-pulse relative z-10 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><Heart size={20} strokeWidth={2.5} /></div>
                    <div className="grid h-[88px] w-[88px] -translate-x-2.5 place-items-center rounded-full border-2 border-primary bg-card font-display text-[28px] font-bold">{current.match.b}</div>
                  </div>
                ) : (
                  <div className="relative grid h-24 w-24 place-items-center" aria-hidden>
                    <span className="burst absolute inset-0 rounded-full border-2 border-primary/60" />
                    <span className="burst-late absolute inset-0 rounded-full border-2 border-primary/40" />
                    <div className="glow-pulse grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground"><Icon size={44} strokeWidth={2.25} /></div>
                  </div>
                )}
                <span className="font-mono text-xs font-medium uppercase tracking-[.1em] text-accent-ink">{current.eyebrow}</span>
                {current.big ? (
                  <div className="-mb-1 -mt-1.5 flex items-baseline gap-2">
                    <span className="num font-display text-[80px] font-bold leading-[.9]">{current.big}</span>
                    {current.unit ? <span className="font-display text-[22px] font-semibold text-muted-foreground">{current.unit}</span> : null}
                  </div>
                ) : null}
                <div className="flex flex-col gap-2">
                  <DialogPrimitive.Title className="font-display text-2xl font-bold leading-[1.15] tracking-[-0.02em] [text-wrap:balance]">{current.title}</DialogPrimitive.Title>
                  {current.sub ? <DialogPrimitive.Description id="cel-sub" className="text-[15px] leading-normal text-muted-foreground [text-wrap:pretty]">{current.sub}</DialogPrimitive.Description> : null}
                </div>
                <div className="mt-1.5 flex w-full flex-col gap-2">
                  <button type="button" autoFocus onClick={() => { const a = current.onPrimary; dismiss(); a?.(); }} className="h-12 rounded-md bg-primary text-base font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[.98]">
                    {current.primary}
                  </button>
                  {current.secondary ? (
                    <button type="button" onClick={dismiss} className="h-11 rounded-md text-[15px] font-medium text-muted-foreground hover:text-foreground">{current.secondary}</button>
                  ) : null}
                </div>
              </DialogPrimitive.Content>
            </div>
          ) : null}
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </Ctx.Provider>
  );
}
