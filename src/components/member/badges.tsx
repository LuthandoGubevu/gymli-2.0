"use client";
import { Lock } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { BADGE_ICONS } from "@/components/icons";
import { Meter, PageHeader, Skeleton } from "@/components/ui/bits";
import { useBadges, useGamification, usePRs } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-today";
import { BADGES, badgeInputs, badgeProgress } from "@/lib/badges";
import { fmtMonthYear } from "@/lib/dates";
import { displayGamification } from "@/lib/streaks";
import { cn } from "@/lib/utils";
import { ProgressTabs } from "./progress-tabs";

export function BadgesPage() {
  const { me, gymId } = useMe();
  const { key: today } = useToday();
  const earned = useBadges(gymId, me.uid);
  const gam = useGamification(gymId, me.uid);
  const prs = usePRs(gymId, me.uid);
  if (!today || earned.loading) return <><ProgressTabs /><Skeleton className="mt-6 h-96 rounded-xl" /></>;
  const map = new Map(earned.data.map((e) => [e.id, e]));
  const inputs = badgeInputs(displayGamification(gam.data, today), prs.data.length);
  return (
    <div className="flex flex-col gap-6">
      <ProgressTabs />
      <PageHeader eyebrow={`Badges · ${map.size} of ${BADGES.length}`} title="Earned the hard way" />
      <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))]">
        {BADGES.map((b) => {
          const e = map.get(b.id);
          const p = badgeProgress(b, inputs);
          const I = BADGE_ICONS[b.icon];
          return (
            <li key={b.id} className="surface flex flex-col gap-3.5 p-[22px]">
              <div className="flex items-start justify-between">
                <span className={cn("grid h-14 w-14 place-items-center rounded-full border", e ? "border-primary/35 bg-primary-soft text-accent-ink" : "border-border bg-elevated text-muted-foreground")} aria-hidden><I size={26} /></span>
                {!e ? <Lock size={16} className="text-muted-foreground" aria-label="Locked" /> : null}
              </div>
              <div className="flex flex-col gap-1"><span className="font-display text-[17px] font-semibold">{b.name}</span><span className="text-sm leading-[1.4] text-muted-foreground">{b.description}</span></div>
              {e ? (
                <span className="mt-auto font-mono text-xs font-medium text-accent-ink">Earned {e.earnedAt ? fmtMonthYear(e.earnedAt.toDate()) : "just now"}</span>
              ) : (
                <div className="mt-auto flex flex-col gap-1.5">
                  <span className="font-mono text-xs font-medium text-muted-foreground">{p.val} / {b.goal}</span>
                  <Meter value={p.ratio * 100} height={6} label={`${b.name} progress`} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
