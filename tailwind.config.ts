// Gymli 2.0 — Tailwind mapping for the design tokens in src/app/globals.css.
// Every colour is a CSS variable holding HSL channels, so dark/light mode and
// per-gym branding are both just variable overrides (see src/lib/branding.ts).
import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const c = (v: string) => `hsl(var(--${v}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: c("background"),
        foreground: c("foreground"),
        card: { DEFAULT: c("card"), foreground: c("card-foreground") },
        popover: { DEFAULT: c("popover"), foreground: c("popover-foreground") },
        elevated: c("surface-elevated"),
        muted: { DEFAULT: c("muted"), foreground: c("muted-foreground") },
        border: c("border"),
        "border-strong": c("border-strong"),
        input: c("input"),
        ring: c("ring"),
        primary: { DEFAULT: c("primary"), foreground: c("primary-foreground") },
        "accent-ink": c("accent-ink"),
        success: c("success"),
        warning: c("warning"),
        busy: c("busy"),
        destructive: { DEFAULT: c("destructive"), foreground: c("destructive-foreground") },
        glass: c("glass"),
        scrim: c("scrim"),
      },
      borderRadius: { "2xl": "1.25rem", xl: "1rem", lg: "0.75rem", md: "0.5rem", sm: "0.375rem" },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: { meter: "cubic-bezier(.2,.8,.2,1)", pop: "cubic-bezier(.2,1.35,.4,1)" },
      keyframes: {
        "gy-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        "gy-fade": { from: { opacity: "0" }, to: { opacity: "1" } },
        "gy-pop": { "0%": { opacity: "0", transform: "scale(.88) translateY(14px)" }, "100%": { opacity: "1", transform: "none" } },
        "gy-burst": { "0%": { transform: "scale(.7)", opacity: ".75" }, "100%": { transform: "scale(2.2)", opacity: "0" } },
        "gy-toast": { from: { opacity: "0", transform: "translate(-50%,12px)" }, to: { opacity: "1", transform: "translate(-50%,0)" } },
      },
      animation: {
        "gy-up": "gy-up 240ms ease-out",
        "gy-fade": "gy-fade 200ms ease-out",
        "gy-pop": "gy-pop 260ms ease-out",
        "gy-pop-big": "gy-pop 460ms cubic-bezier(.2,1.35,.4,1)",
        "gy-toast": "gy-toast 220ms ease-out",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
