// All "which day is it" logic happens in the gym's timezone, not the device's,
// so a streak doesn't break because a member's phone is set to UTC.
import type { DayKey } from "./types";
import { DAY_KEYS } from "./types";

export const DEFAULT_TZ = "Africa/Johannesburg";

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

export function zonedParts(date: Date, timeZone = DEFAULT_TZ): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday as string);
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour % 24, minute: +p.minute, weekday: wd };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD in the gym's timezone. */
export function dateKey(date: Date, timeZone = DEFAULT_TZ) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function monthKey(date: Date, timeZone = DEFAULT_TZ) {
  return dateKey(date, timeZone).slice(0, 7);
}

/** Pure calendar arithmetic on YYYY-MM-DD strings (no timezone involved). */
export function addDays(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function daysBetween(a: string, b: string) {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** 0 = Monday … 6 = Sunday for a YYYY-MM-DD key. */
export function weekdayOfKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function dayKeyOf(key: string): DayKey {
  return DAY_KEYS[weekdayOfKey(key)];
}

export function mondayOf(key: string) {
  return addDays(key, -weekdayOfKey(key));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function fmtKey(key: string, style: "short" | "long" | "dayMonth" | "weekdayDay" = "long") {
  const [y, m, d] = key.split("-").map(Number);
  if (style === "dayMonth") return `${d} ${MONTHS[m - 1]}`;
  if (style === "weekdayDay") return `${DAY_KEYS[weekdayOfKey(key)]} ${d} ${MONTHS[m - 1]}`;
  if (style === "short") return `${pad(d)} ${MONTHS[m - 1]}`;
  return `${pad(d)} ${MONTHS[m - 1]} ${y}`;
}

export function monthName(mk: string, long = true) {
  const m = Number(mk.slice(5, 7));
  return long ? MONTHS_LONG[m - 1] : MONTHS[m - 1];
}

export function fmtMonthYear(date: Date) {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function timeHHmm(date: Date, timeZone = DEFAULT_TZ) {
  const p = zonedParts(date, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "Just now", "2h ago", "Yesterday", "Mon", "18 Sep" */
export function relativeTime(date: Date, now = new Date()) {
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  if (diff < 7 * 86400) return DAY_KEYS[(date.getDay() + 6) % 7];
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** Minutes since midnight for "HH:mm". */
export function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
