"use client";
import { useMemo } from "react";
import { useGym } from "@/components/providers/gym";
import { dateKey, zonedParts } from "@/lib/dates";
import { useNow } from "./use-now";

/** "Now" in the gym's timezone. `key` is null until the client clock is available. */
export function useToday() {
  const { gym } = useGym();
  const now = useNow();
  return useMemo(() => {
    if (!now) return { now: null, key: null, parts: null, tz: gym.timezone };
    return { now, key: dateKey(now, gym.timezone), parts: zonedParts(now, gym.timezone), tz: gym.timezone };
  }, [now, gym.timezone]);
}
