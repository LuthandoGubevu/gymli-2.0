// Static badge catalog. Conditions are pure functions of gamification + PR count,
// so the same evaluation runs after every check-in and every PR save.
import type { Gamification } from "./types";

export type BadgeIcon = "door-open" | "footprints" | "repeat" | "crown" | "flame" | "mountain" | "trophy" | "trending-up" | "calendar-check" | "heart";

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: BadgeIcon;
  goal: number;
  metric: "totalVisits" | "longestStreak" | "prCount";
}

export const BADGES: BadgeDef[] = [
  { id: "first_visit", name: "First Visit", description: "Checked in for the first time.", icon: "door-open", goal: 1, metric: "totalVisits" },
  { id: "visits_5", name: "Getting Started", description: "Checked in 5 times.", icon: "footprints", goal: 5, metric: "totalVisits" },
  { id: "visits_25", name: "Regular", description: "Checked in 25 times.", icon: "repeat", goal: 25, metric: "totalVisits" },
  { id: "visits_100", name: "Century Club", description: "Checked in 100 times.", icon: "crown", goal: 100, metric: "totalVisits" },
  { id: "streak_7", name: "Week Warrior", description: "Reached a 7-day check-in streak.", icon: "flame", goal: 7, metric: "longestStreak" },
  { id: "streak_30", name: "Iron Will", description: "Reached a 30-day check-in streak.", icon: "mountain", goal: 30, metric: "longestStreak" },
  { id: "pr_setter", name: "PR Setter", description: "Logged your first personal record.", icon: "trophy", goal: 1, metric: "prCount" },
  { id: "pr_grinder", name: "PR Grinder", description: "Logged 5 personal records.", icon: "trending-up", goal: 5, metric: "prCount" },
];

export const BADGE_IDS = BADGES.map((b) => b.id);

export interface BadgeInputs { totalVisits: number; longestStreak: number; prCount: number }

export function badgeInputs(g: Partial<Gamification> | null | undefined, prCount: number): BadgeInputs {
  return { totalVisits: g?.totalVisits ?? 0, longestStreak: g?.longestStreakDays ?? 0, prCount };
}

export function badgeProgress(b: BadgeDef, inputs: BadgeInputs) {
  const val = inputs[b.metric];
  return { val: Math.min(val, b.goal), ratio: Math.min(1, val / b.goal), met: val >= b.goal };
}

export function qualifiedBadgeIds(inputs: BadgeInputs) {
  return BADGES.filter((b) => badgeProgress(b, inputs).met).map((b) => b.id);
}
