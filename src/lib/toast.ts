"use client";
// Toast store (replaces shadcn's toast, whose module-level `memoryState` read via
// useState is a hydration bug). One toast at a time, auto-dismiss after 2.8s.
import { useSyncExternalStore } from "react";

export type ToastTone = "success" | "warning" | "accent" | "muted" | "destructive";
export type ToastIcon = "check" | "map-pin" | "x" | "hourglass" | "heart" | "megaphone" | "sparkles" | "alert" | "calendar";
export interface ToastData { id: number; text: string; icon: ToastIcon; tone: ToastTone }

let current: ToastData | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, icon: ToastIcon = "check", tone: ToastTone = "success") {
  clearTimeout(timer);
  current = { id: ++seq, text, icon, tone };
  emit();
  timer = setTimeout(() => { current = null; emit(); }, 2800);
}

export function toastError(text: string) {
  toast(text, "alert", "destructive");
}

export function useToast() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
    () => null,
  );
}
