"use client";
import type { Celebration } from "@/components/providers/celebration";
import { BADGES } from "./badges";
import type { CheckInResult } from "./actions/checkin";
import { toast } from "./toast";

export function celebrateBadges(celebrate: (c: Celebration) => void, ids: string[], earnedTotal: number, goBadges?: () => void) {
  ids.forEach((id, i) => {
    const b = BADGES.find((x) => x.id === id);
    if (!b) return;
    celebrate({
      kind: "badge", icon: b.icon, eyebrow: "Badge earned", title: b.name,
      sub: `${b.description} ${earnedTotal - ids.length + i + 1} of ${BADGES.length} badges earned.`,
      primary: "View badges", secondary: "Later", onPrimary: goBadges,
    });
  });
}

/** Streak milestone (every 7 days) → celebration; otherwise a toast. Then any new badges. */
export function celebrateCheckIn(celebrate: (c: Celebration) => void, r: CheckInResult, prefix = "Checked in", opts?: { earnedBefore?: number; goBadges?: () => void }) {
  const g = r.gamification;
  if (!r.firstToday || !g) { toast("You're already checked in today", "check", "muted"); return; }
  const s = g.currentStreakDays;
  if (s > 0 && s % 7 === 0) {
    const toIron = Math.max(0, 30 - g.longestStreakDays);
    celebrate({
      kind: "streak", icon: "flame", eyebrow: "Streak milestone", big: String(s), unit: "days",
      title: s === 7 ? "One week straight." : s === 14 ? "Two weeks straight." : `${s} days straight.`,
      sub: `Your best is ${g.longestStreakDays} days.${toIron > 0 ? ` ${toIron} more to earn Iron Will.` : ""}`,
      primary: "Keep it going",
    });
  } else {
    toast(`${prefix} · day ${s} of your streak`, "map-pin", "success");
  }
  if (r.newBadges.length) celebrateBadges(celebrate, r.newBadges, (opts?.earnedBefore ?? 0) + r.newBadges.length, opts?.goBadges);
}
