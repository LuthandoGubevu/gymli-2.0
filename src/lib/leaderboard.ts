import type { LeaderboardEntry } from "./types";

/** Ranked by visits this month, then current streak. */
export function rankLeaderboard(entries: LeaderboardEntry[]) {
  return [...entries].sort((a, b) => b.visits - a.visits || b.streak - a.streak || a.displayName.localeCompare(b.displayName));
}
