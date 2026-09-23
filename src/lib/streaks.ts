// Streak maths. Pure, so it's unit-tested and shared by check-in and the dashboard.
import type { Gamification } from "./types";
import { daysBetween } from "./dates";

export const EMPTY_GAMIFICATION: Gamification = {
  currentStreakDays: 0, longestStreakDays: 0, totalVisits: 0, visitsThisMonth: 0, monthKey: "", lastVisitDate: null,
};

/** Applies a visit on `today` (YYYY-MM-DD). Returns null if today was already counted. */
export function applyVisit(prev: Gamification | null | undefined, today: string): Gamification | null {
  const g = { ...EMPTY_GAMIFICATION, ...(prev ?? {}) };
  if (g.lastVisitDate === today) return null;
  const gap = g.lastVisitDate ? daysBetween(g.lastVisitDate, today) : Infinity;
  const streak = gap === 1 ? g.currentStreakDays + 1 : 1;
  const mk = today.slice(0, 7);
  return {
    currentStreakDays: streak,
    longestStreakDays: Math.max(g.longestStreakDays, streak),
    totalVisits: g.totalVisits + 1,
    visitsThisMonth: g.monthKey === mk ? g.visitsThisMonth + 1 : 1,
    monthKey: mk,
    lastVisitDate: today,
  };
}

/** What the member should *see* today: a streak is still alive until a full day is missed. */
export function displayGamification(g: Gamification | null | undefined, today: string) {
  const base = { ...EMPTY_GAMIFICATION, ...(g ?? {}) };
  const gap = base.lastVisitDate ? daysBetween(base.lastVisitDate, today) : Infinity;
  return {
    ...base,
    currentStreakDays: gap <= 1 ? base.currentStreakDays : 0,
    visitsThisMonth: base.monthKey === today.slice(0, 7) ? base.visitsThisMonth : 0,
    visitedToday: gap === 0,
  };
}
