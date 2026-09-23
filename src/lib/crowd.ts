import type { Gym } from "./types";

export type CrowdLevel = "Quiet" | "Moderate" | "Busy" | "Packed";

export interface CrowdInfo {
  count: number;
  pct: number;
  level: CrowdLevel;
  /** CSS colour expression, e.g. "hsl(var(--success))" */
  color: string;
  softClass: string;
  message: string;
}

export const DEFAULT_THRESHOLDS = { low: 20, moderate: 50, packed: 80 };

export function thresholdsOf(gym: Pick<Gym, "thresholdLow" | "thresholdModerate" | "thresholdPacked"> | null | undefined) {
  return {
    low: gym?.thresholdLow ?? DEFAULT_THRESHOLDS.low,
    moderate: gym?.thresholdModerate ?? DEFAULT_THRESHOLDS.moderate,
    packed: Math.max(1, gym?.thresholdPacked ?? DEFAULT_THRESHOLDS.packed),
  };
}

export function crowdInfo(count: number, t = DEFAULT_THRESHOLDS): CrowdInfo {
  const pct = Math.min(100, Math.round((count / t.packed) * 100));
  const mk = (level: CrowdLevel, token: string, message: string): CrowdInfo => ({ count, pct, level, color: `hsl(var(--${token}))`, softClass: `soft-${token}`, message });
  if (count <= t.low) return mk("Quiet", "success", "Quiet right now — ideal time to train.");
  if (count <= t.moderate) return mk("Moderate", "warning", "Steady at the gym — most stations are free.");
  if (count <= t.packed) return mk("Busy", "busy", "Busy right now — expect short waits on racks.");
  return mk("Packed", "destructive", "Packed — maybe try a little later.");
}

export function levelRanges(t = DEFAULT_THRESHOLDS) {
  return [
    { level: "Quiet" as const, token: "success", range: `0–${t.low}` },
    { level: "Moderate" as const, token: "warning", range: `${t.low + 1}–${t.moderate}` },
    { level: "Busy" as const, token: "busy", range: `${t.moderate + 1}–${t.packed}` },
    { level: "Packed" as const, token: "destructive", range: `${t.packed}+` },
  ];
}

/** Fill colour for class capacity bars: <60% success, <90% warning, else destructive. */
export function fillToken(ratio: number) {
  return ratio < 0.6 ? "success" : ratio < 0.9 ? "warning" : "destructive";
}
