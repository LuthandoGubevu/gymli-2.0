import { describe, expect, it, vi } from "vitest";
import { applyVisit, displayGamification } from "@/lib/streaks";
import { addDays, dateKey, daysBetween, mondayOf, weekdayOfKey } from "@/lib/dates";
import { crowdInfo } from "@/lib/crowd";
import { brandVars, hexToHsl, hslToHex, parseHsl } from "@/lib/branding";
import { badgeInputs, qualifiedBadgeIds } from "@/lib/badges";
import { rankFor } from "@/lib/ranks";
import { rankLeaderboard } from "@/lib/leaderboard";
import { averageGrid, bestWindow } from "@/lib/forecast";
import { rulesPlan } from "@/lib/coach";
import { readFileSync } from "node:fs";
import { SUPER_ADMIN_EMAILS, isSuperAdmin } from "@/lib/platform";

vi.mock("@/lib/env", () => ({ rootDomain: "gymli.app", defaultGymId: "demo" }));
const { resolveGymId, slugFromHost } = await import("@/lib/tenant");

describe("platform super admin", () => {
  it("the email list in firestore.rules matches src/lib/platform.ts", () => {
    const rules = readFileSync("firestore.rules", "utf8");
    const m = rules.match(/function superAdmins\(\) \{ return \[([^\]]*)\]; \}/);
    expect(m, "superAdmins() not found in firestore.rules").toBeTruthy();
    const fromRules = [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
    expect(fromRules).toEqual([...SUPER_ADMIN_EMAILS].sort());
  });
  it("requires a verified address", () => {
    expect(isSuperAdmin({ email: "LGubevu@gmail.com", emailVerified: true })).toBe(true);
    expect(isSuperAdmin({ email: "lgubevu@gmail.com", emailVerified: false })).toBe(false);
    expect(isSuperAdmin({ email: "someone@else.com", emailVerified: true })).toBe(false);
  });
});

describe("streaks", () => {
  it("starts, extends, resets and is idempotent per day", () => {
    const d1 = applyVisit(null, "2026-09-01")!;
    expect(d1).toMatchObject({ currentStreakDays: 1, totalVisits: 1, visitsThisMonth: 1, monthKey: "2026-09" });
    expect(applyVisit(d1, "2026-09-01")).toBeNull();
    const d2 = applyVisit(d1, "2026-09-02")!;
    expect(d2.currentStreakDays).toBe(2);
    const d4 = applyVisit(d2, "2026-09-04")!; // missed the 3rd
    expect(d4).toMatchObject({ currentStreakDays: 1, longestStreakDays: 2, totalVisits: 3 });
  });
  it("rolls the monthly count over and keeps streaks across months", () => {
    const aug = { currentStreakDays: 5, longestStreakDays: 5, totalVisits: 20, visitsThisMonth: 12, monthKey: "2026-08", lastVisitDate: "2026-08-31" };
    expect(applyVisit(aug, "2026-09-01")).toMatchObject({ currentStreakDays: 6, visitsThisMonth: 1, monthKey: "2026-09" });
  });
  it("shows a streak as alive until a full day is missed", () => {
    const g = { currentStreakDays: 4, longestStreakDays: 9, totalVisits: 30, visitsThisMonth: 4, monthKey: "2026-09", lastVisitDate: "2026-09-22" };
    expect(displayGamification(g, "2026-09-23").currentStreakDays).toBe(4);
    expect(displayGamification(g, "2026-09-24").currentStreakDays).toBe(0);
    expect(displayGamification(g, "2026-10-01").visitsThisMonth).toBe(0);
  });
});

describe("dates are computed in the gym's timezone", () => {
  it("23:30 UTC is already tomorrow in Johannesburg", () => {
    const t = new Date("2026-09-23T23:30:00Z");
    expect(dateKey(t, "UTC")).toBe("2026-09-23");
    expect(dateKey(t, "Africa/Johannesburg")).toBe("2026-09-24");
  });
  it("calendar maths", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(weekdayOfKey("2026-09-23")).toBe(2); // Wednesday
    expect(mondayOf("2026-09-27")).toBe("2026-09-21");
  });
});

describe("crowd levels", () => {
  it("uses the gym's thresholds and caps pct at 100", () => {
    const t = { low: 20, moderate: 50, packed: 80 };
    expect(crowdInfo(20, t).level).toBe("Quiet");
    expect(crowdInfo(21, t).level).toBe("Moderate");
    expect(crowdInfo(80, t).level).toBe("Busy");
    expect(crowdInfo(120, t)).toMatchObject({ level: "Packed", pct: 100 });
  });
});

describe("branding", () => {
  it("round-trips hex ↔ hsl and picks readable text", () => {
    expect(hexToHsl("#F7C51B")).toBe("46 93% 54%");
    expect(hslToHex("45 93% 52%").toLowerCase()).toBe("#f6be13");
    expect(parseHsl("nonsense")).toBeNull();
    expect(brandVars("45 93% 52%")["--primary-foreground"]).toBe("222 47% 11%"); // dark text on gold
    expect(brandVars("222 80% 30%")["--primary-foreground"]).toBe("0 0% 100%"); // white on navy
  });
});

describe("tenant resolution", () => {
  it("subdomain → cookie → default", () => {
    expect(slugFromHost("ironworks.gymli.app")).toBe("ironworks");
    expect(slugFromHost("gymli.app")).toBeNull();
    expect(slugFromHost("evil.com")).toBeNull();
    expect(slugFromHost("a.b.gymli.app")).toBeNull();
    expect(resolveGymId("ironworks.gymli.app", "other")).toEqual({ gymId: "ironworks", source: "subdomain" });
    expect(resolveGymId("localhost:3000", "northside")).toEqual({ gymId: "northside", source: "cookie" });
    expect(resolveGymId("localhost:3000", "../x")).toEqual({ gymId: "demo", source: "default" });
  });
});

describe("gamification rules", () => {
  it("badges, ranks and leaderboard ordering", () => {
    expect(qualifiedBadgeIds(badgeInputs({ totalVisits: 25, longestStreakDays: 7 }, 1))).toEqual(["first_visit", "visits_5", "visits_25", "streak_7", "pr_setter"]);
    expect(rankFor(15)).toMatchObject({ current: { name: "Dedicated" }, needText: "1 visit to Beast Mode" });
    expect(rankFor(30).needText).toBe("You're at the top");
    const e = (uid: string, visits: number, streak: number) => ({ uid, displayName: uid, initials: "", visits, streak });
    expect(rankLeaderboard([e("a", 5, 1), e("b", 9, 0), e("c", 5, 4)]).map((x) => x.uid)).toEqual(["b", "c", "a"]);
  });
});

describe("forecast & rules coach", () => {
  it("averages by weekday and finds the quietest window", () => {
    const grid = averageGrid([{ dateKey: "2026-09-21", dayOfWeek: 0, total: 30, hours: { "06": 10, "18": 20 } }, { dateKey: "2026-09-14", dayOfWeek: 0, total: 10, hours: { "06": 10 } }]);
    expect(grid[0][6]).toBe(10);
    expect(grid[0][18]).toBe(10);
    expect(bestWindow(grid[0], 6, 5, 21, 2)?.start).toBe(7);
  });
  it("prescribes loads from real PRs", () => {
    const p = rulesPlan({ firstName: "T", goals: ["Strength"], usualTrainingTime: "Evenings", currentStreakDays: 14, longestStreakDays: 21, totalVisits: 88, visitsThisMonth: 15, prs: [{ exercise: "Back Squat", value: 140, unit: "kg", date: "2026-09-18" }], weekOf: "2026-09-28" });
    expect(p.days).toHaveLength(4);
    expect(p.days[0].exercises[0].prescription).toBe("5×5 @ 112.5 kg");
    expect(p.headline).toContain("14-day");
  });
});
