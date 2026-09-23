"use client";
// A shared clock. Server snapshot is null so SSR never renders a time that differs
// from the client's first render; components render a placeholder until it ticks in.
import { useSyncExternalStore } from "react";

let now: Date | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = new Date();
    timer = setInterval(() => { now = new Date(); listeners.forEach((l) => l()); }, 30_000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) { clearInterval(timer); timer = undefined; }
  };
}

export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, () => now ?? (now = new Date()), () => null);
}
