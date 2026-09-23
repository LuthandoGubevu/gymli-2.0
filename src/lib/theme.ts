"use client";
// Theme store. Reads localStorage only inside subscribe/getSnapshot (client), and
// getServerSnapshot always returns "dark", so SSR and the first client render match.
// The inline script in app/layout.tsx applies the class before paint to avoid a flash.
import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";
export const THEME_KEY = "gymli-theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function setTheme(t: Theme) {
  try { localStorage.setItem(THEME_KEY, t); } catch { /* private mode */ }
  document.documentElement.classList.toggle("light", t === "light");
  document.documentElement.classList.toggle("dark", t === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#F5F7FA" : "#0B1120");
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === THEME_KEY) cb(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as Theme);
  return { theme, toggle: () => setTheme(theme === "dark" ? "light" : "dark"), setTheme };
}

/** Inline, pre-hydration script. Kept tiny and dependency-free. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')==='light'?'light':'dark';var d=document.documentElement;d.classList.remove('dark','light');d.classList.add(t);}catch(e){}})();`;
