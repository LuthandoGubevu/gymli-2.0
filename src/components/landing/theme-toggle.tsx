"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function LandingThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className="grid h-10 w-10 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground">
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
