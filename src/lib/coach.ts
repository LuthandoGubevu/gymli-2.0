// AI coach: plan schema (shared by the server route and the UI) and a deterministic
// rules-based generator used when no LLM key is configured or the model declines.
import { z } from "zod/v4";
import { DAY_KEYS, type DayKey, type PersonalRecord, type PlanDay, type TrainingTime } from "./types";

export const PlanSchema = z.object({
  headline: z.string().describe("One punchy sentence summarising the week's intent, max ~90 characters."),
  rationale: z.string().describe("2-3 sentences explaining why this week looks like this, referencing the member's real numbers."),
  days: z.array(z.object({
    day: z.enum(DAY_KEYS as [DayKey, ...DayKey[]]),
    focus: z.string().describe("2-4 words, e.g. 'Lower body strength'"),
    summary: z.string().describe("One sentence on the session's goal."),
    exercises: z.array(z.object({ name: z.string(), prescription: z.string().describe("e.g. '5×5 @ 80% of 140 kg' or '20 min zone 2'") })).min(2).max(7),
  })).min(2).max(6).describe("Training days only, in Mon→Sun order. Omit rest days."),
});
export type PlanOutput = z.infer<typeof PlanSchema>;

export interface CoachInput {
  firstName: string;
  goals: string[];
  usualTrainingTime: TrainingTime | string;
  currentStreakDays: number;
  longestStreakDays: number;
  totalVisits: number;
  visitsThisMonth: number;
  prs: Pick<PersonalRecord, "exercise" | "value" | "unit" | "date">[];
  weekOf: string;
}

const pct = (v: number, p: number) => Math.round((v * p) / 2.5) * 2.5;

/** Rules-based plan from the same inputs — used without an API key, or as a fallback. */
export function rulesPlan(i: CoachInput): PlanOutput {
  const find = (re: RegExp) => i.prs.find((p) => re.test(p.exercise.toLowerCase()));
  const squat = find(/squat/), bench = find(/bench/), dead = find(/deadlift/), press = find(/overhead|shoulder press|military|ohp/);
  const load = (p: typeof squat, sets: string, frac: number, fallback: string) => (p ? `${sets} @ ${pct(p.value, frac)} ${p.unit}` : fallback);
  const goals = i.goals.map((g) => g.toLowerCase());
  const conditioning = goals.some((g) => /hyrox|endurance|weight|boxing/.test(g));
  const sessions = i.visitsThisMonth >= 12 || i.currentStreakDays >= 7 ? 4 : 3;
  const days: PlanDay[] = [
    { day: "Mon", focus: "Lower body strength", summary: "Heavy squats first while you're fresh.", exercises: [
      { name: squat?.exercise ?? "Back Squat", prescription: load(squat, "5×5", 0.8, "5×5, leave 2 reps in the tank") },
      { name: "Romanian Deadlift", prescription: "3×8" }, { name: "Walking Lunges", prescription: "3×12 each leg" }] },
    { day: "Tue", focus: conditioning ? "Engine" : "Upper body push", summary: conditioning ? "Aerobic base work you can talk through." : "Pressing strength plus shoulder health.", exercises: conditioning
      ? [{ name: "Rower or bike", prescription: "30 min zone 2" }, { name: "Sled push", prescription: "6×20 m" }, { name: "Farmer carry", prescription: "4×40 m" }]
      : [{ name: bench?.exercise ?? "Bench Press", prescription: load(bench, "4×6", 0.78, "4×6") }, { name: press?.exercise ?? "Overhead Press", prescription: load(press, "3×8", 0.72, "3×8") }, { name: "Face Pulls", prescription: "3×15" }] },
    { day: "Thu", focus: "Posterior chain", summary: "Deadlift pattern and upper back.", exercises: [
      { name: dead?.exercise ?? "Deadlift", prescription: load(dead, "3×3", 0.85, "3×3, smooth reps") },
      { name: "Weighted Pull-up", prescription: "4×5" }, { name: "Hip Thrust", prescription: "3×10" }] },
    { day: "Sat", focus: conditioning ? "Race-pace mix" : "Full body volume", summary: "Longer session to close the week strong.", exercises: conditioning
      ? [{ name: "Wall balls", prescription: "5×20" }, { name: "Ski erg", prescription: "5×500 m" }, { name: "Burpee broad jumps", prescription: "4×10" }]
      : [{ name: "Front Squat", prescription: "4×6" }, { name: bench?.exercise ?? "Bench Press", prescription: "3×10 light" }, { name: "Rows", prescription: "4×10" }] },
  ];
  const chosen = days.slice(0, sessions);
  return {
    headline: i.currentStreakDays >= 7 ? `Protect the ${i.currentStreakDays}-day streak, push the big lifts.` : `${sessions} solid sessions to build momentum.`,
    rationale: `You've logged ${i.visitsThisMonth} visits this month and ${i.totalVisits} overall${i.prs.length ? `, with ${i.prs.length} PRs on record` : ""}. `
      + `This week is built around ${i.goals.join(", ").toLowerCase() || "general fitness"} with ${sessions} sessions that fit ${String(i.usualTrainingTime).toLowerCase()} training.`,
    days: chosen,
  };
}

export function coachPrompt(i: CoachInput) {
  return [
    `Build next week's training plan (week of ${i.weekOf}) for ${i.firstName}, a member of an independent gym.`,
    `Goals: ${i.goals.join(", ") || "general fitness"}. Usually trains: ${i.usualTrainingTime}.`,
    `Consistency: current streak ${i.currentStreakDays} days (best ${i.longestStreakDays}), ${i.visitsThisMonth} visits this month, ${i.totalVisits} total.`,
    i.prs.length ? `Personal records: ${i.prs.map((p) => `${p.exercise} ${p.value} ${p.unit} (${p.date})`).join("; ")}.` : "No personal records logged yet — prescribe by feel (RPE/RIR), not percentages.",
    "Choose a realistic number of sessions for their consistency (3 if under ~8 visits/month, up to 5 if very consistent).",
    "Where a PR exists, prescribe working loads as concrete numbers derived from it. Keep it safe, specific and gym-floor practical. No medical advice.",
  ].join("\n");
}
