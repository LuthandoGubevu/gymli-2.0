// Crowd forecast + heatmap from the hourly check-in rollups (checkInStats).
import type { CheckInStats } from "./types";
import { addDays, weekdayOfKey } from "./dates";

/** Average check-ins per (weekday, hour) over the given rollups, excluding `excludeKey` (today). */
export function averageGrid(stats: CheckInStats[], excludeKey?: string) {
  const sums = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const days = new Array(7).fill(0);
  for (const s of stats) {
    if (s.dateKey === excludeKey) continue;
    const d = weekdayOfKey(s.dateKey);
    days[d]++;
    for (const [h, n] of Object.entries(s.hours ?? {})) sums[d][Number(h)] += n;
  }
  return sums.map((row, d) => row.map((v) => (days[d] ? v / days[d] : 0)));
}

/** Quietest window of `len` consecutive hours at/after `fromHour`, within opening hours. */
export function bestWindow(row: number[], fromHour: number, openHour: number, closeHour: number, len = 2) {
  let best: { start: number; score: number } | null = null;
  for (let h = Math.max(fromHour, openHour); h + len - 1 <= closeHour; h++) {
    const score = row.slice(h, h + len).reduce((a, b) => a + b, 0);
    if (!best || score < best.score) best = { start: h, score };
  }
  return best;
}

export function eightWeeksAgo(today: string) {
  return addDays(today, -56);
}
