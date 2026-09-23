import {
  Crown, DoorOpen, Flame, Footprints, Mountain, Repeat, Rocket, ShieldCheck, Sprout, TrendingUp, Trophy, CalendarCheck, Heart, type LucideIcon,
} from "lucide-react";
import type { BadgeIcon } from "@/lib/badges";
import type { RankIcon } from "@/lib/ranks";

export const BADGE_ICONS: Record<BadgeIcon, LucideIcon> = {
  "door-open": DoorOpen, footprints: Footprints, repeat: Repeat, crown: Crown, flame: Flame, mountain: Mountain,
  trophy: Trophy, "trending-up": TrendingUp, "calendar-check": CalendarCheck, heart: Heart,
};

export const RANK_ICONS: Record<RankIcon, LucideIcon> = {
  sprout: Sprout, rocket: Rocket, "shield-check": ShieldCheck, flame: Flame, crown: Crown,
};

export function Logo({ size = 30, name = "Gymli", showName = true, logoUrl }: { size?: number; name?: string; showName?: boolean; logoUrl?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" width={size} height={size} className="flex-none rounded-md object-cover" style={{ width: size, height: size }} />
      ) : (
        <span aria-hidden className="grid flex-none place-items-center rounded-md bg-primary font-display font-bold leading-none text-primary-foreground" style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }}>
          {(name.trim()[0] ?? "g").toLowerCase()}
        </span>
      )}
      {showName ? <span className="whitespace-nowrap font-display text-xl font-bold leading-none tracking-[-0.02em]">{name}</span> : null}
    </span>
  );
}
