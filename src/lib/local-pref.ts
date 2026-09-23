"use client";
// Small hydration-safe boolean preference (e.g. sidebar collapsed).
import { useCallback, useSyncExternalStore } from "react";

const listeners = new Map<string, Set<() => void>>();

export function useLocalPref(key: string, fallback: boolean) {
  const subscribe = useCallback((cb: () => void) => {
    const set = listeners.get(key) ?? new Set();
    set.add(cb);
    listeners.set(key, set);
    return () => set.delete(cb);
  }, [key]);
  const get = () => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v === "1";
    } catch {
      return fallback;
    }
  };
  const value = useSyncExternalStore(subscribe, get, () => fallback);
  const set = (v: boolean) => {
    try { localStorage.setItem(key, v ? "1" : "0"); } catch { /* ignore */ }
    listeners.get(key)?.forEach((l) => l());
  };
  return [value, set] as const;
}
