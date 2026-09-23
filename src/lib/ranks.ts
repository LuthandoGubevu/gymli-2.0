export interface Rank { name: string; min: number; icon: RankIcon }
export type RankIcon = "sprout" | "rocket" | "shield-check" | "flame" | "crown";

export const RANKS: Rank[] = [
  { name: "Rookie", min: 0, icon: "sprout" },
  { name: "Regular", min: 5, icon: "rocket" },
  { name: "Dedicated", min: 11, icon: "shield-check" },
  { name: "Beast Mode", min: 16, icon: "flame" },
  { name: "Champion", min: 25, icon: "crown" },
];

export function rankFor(visitsThisMonth: number) {
  let idx = 0;
  RANKS.forEach((r, i) => { if (visitsThisMonth >= r.min) idx = i; });
  const cur = RANKS[idx], next = RANKS[idx + 1];
  const pct = next ? Math.floor(((visitsThisMonth - cur.min) / (next.min - cur.min)) * 100) : 100;
  const need = next ? next.min - visitsThisMonth : 0;
  return { idx, current: cur, next, pct, needText: next ? `${need} visit${need === 1 ? "" : "s"} to ${next.name}` : "You're at the top" };
}
