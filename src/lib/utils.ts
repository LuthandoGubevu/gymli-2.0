import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(first?: string, last?: string) {
  const a = (first ?? "").trim()[0] ?? "";
  const b = (last ?? "").trim()[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  return initials(parts[0], parts.length > 1 ? parts[parts.length - 1] : "");
}

export function fullName(p: { firstName?: string; lastName?: string } | null | undefined) {
  return [p?.firstName, p?.lastName].filter(Boolean).join(" ");
}

export function plural(n: number, one: string, many = one + "s") {
  return `${n} ${n === 1 ? one : many}`;
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    const code = String((e as { code: string }).code);
    const map: Record<string, string> = {
      "auth/invalid-credential": "That email and password don't match.",
      "auth/wrong-password": "That email and password don't match.",
      "auth/user-not-found": "No account with that email.",
      "auth/email-already-in-use": "An account with that email already exists.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
      "auth/network-request-failed": "Network error — check your connection.",
      "auth/operation-not-allowed": "Email/password sign-in isn't enabled for this Firebase project (Authentication → Sign-in method).",
      "auth/unauthorized-continue-uri": "This site's domain isn't in Firebase's Authorized domains list (Authentication → Settings).",
      "permission-denied": "You don't have permission to do that.",
      unavailable: "You're offline — try again when you're back online.",
    };
    if (map[code]) return map[code];
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}
