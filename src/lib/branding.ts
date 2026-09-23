// Per-gym branding = overriding a handful of CSS variables. Brand colour is stored
// on gyms/{gymId}.brandPrimary as HSL channels ("45 93% 52%").
export const DEFAULT_BRAND = "45 93% 52%";

export function parseHsl(hsl: string): [number, number, number] | null {
  const m = hsl.trim().match(/^(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%$/);
  if (!m) return null;
  const [h, s, l] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (h > 360 || s > 100 || l > 100) return null;
  return [h, s, l];
}

export function hexToHsl(hex: string): string | null {
  const m = hex.trim().replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hslToHex(hsl: string): string {
  const p = parseHsl(hsl) ?? parseHsl(DEFAULT_BRAND)!;
  const [h, s, l] = [p[0], p[1] / 100, p[2] / 100];
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

/** Relative luminance of an HSL colour, used to pick readable text on the brand fill. */
function luminance(hsl: [number, number, number]) {
  const hex = hslToHex(`${hsl[0]} ${hsl[1]}% ${hsl[2]}%`).slice(1);
  const ch = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function brandVars(brandPrimary: string | undefined | null): Record<string, string> {
  const p = parseHsl(brandPrimary || DEFAULT_BRAND) ?? parseHsl(DEFAULT_BRAND)!;
  const [h, s, l] = p;
  const onBrandDark = luminance(p) > 0.36;
  return {
    "--primary": `${h} ${s}% ${l}%`,
    "--ring": `${h} ${s}% ${l}%`,
    // Brand used as text: lighter on dark surfaces, darker on white (contrast-safe).
    "--accent-ink": `${h} ${s}% ${Math.min(72, Math.max(l + 6, 58))}%`,
    "--accent-ink-light": `${h} ${s}% ${Math.min(32, l)}%`,
    "--primary-foreground": onBrandDark ? "222 47% 11%" : "0 0% 100%",
  };
}

export function brandStyleTag(brandPrimary: string | undefined | null) {
  const vars = brandVars(brandPrimary);
  const body = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";");
  // Applied to :root and both theme classes so it wins over the defaults in globals.css.
  return `:root,.dark,.light{${body}}`;
}
