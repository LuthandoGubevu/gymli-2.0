// POST /api/coach — generates a weekly plan for the signed-in member.
// Server-only: the LLM key never reaches the client. The caller's Firebase ID token is
// verified, then used to read their data and write the plan *as them* through the
// Firestore REST API, so security rules apply exactly as they do in the browser.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { coachPrompt, PlanSchema, rulesPlan, type CoachInput, type PlanOutput } from "@/lib/coach";
import { addDays, dateKey, DEFAULT_TZ, mondayOf, weekdayOfKey } from "@/lib/dates";
import { createDocument, getDocument, listDocuments, runQuery } from "@/lib/server/firestore-rest";
import { verifyIdToken } from "@/lib/server/verify-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOLDOWN_MS = 6 * 60 * 60 * 1000; // one plan per member per 6 hours
const recent = new Map<string, number>(); // per-instance backstop against rapid repeats

const SYSTEM = "You are a pragmatic strength & conditioning coach writing weekly plans inside a gym's member app. Be specific, encouraging and concise. Use the member's real numbers; never invent PRs.";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  let uid: string;
  try { ({ uid } = await verifyIdToken(token)); } catch { return NextResponse.json({ error: "Your session expired — sign in again." }, { status: 401 }); }

  const last = recent.get(uid);
  if (last && Date.now() - last < 30_000) return NextResponse.json({ error: "Hang on — your plan is already being built." }, { status: 429 });
  recent.set(uid, Date.now());

  try {
    const user = await getDocument(`users/${uid}`, { idToken: token });
    if (!user?.gymId) return NextResponse.json({ error: "No member profile." }, { status: 403 });
    const gymId = String(user.gymId);
    const plansPath = `gyms/${gymId}/workoutPlans/${uid}`;

    const [latest] = await runQuery(plansPath, "plans", token, { orderBy: "createdAt", direction: "DESCENDING", limit: 1 });
    const lastAt = latest?.createdAt ? Date.parse(String(latest.createdAt)) : 0;
    if (lastAt && Date.now() - lastAt < COOLDOWN_MS) {
      const mins = Math.ceil((COOLDOWN_MS - (Date.now() - lastAt)) / 60000);
      return NextResponse.json({ error: `You can regenerate in ${mins >= 60 ? `${Math.ceil(mins / 60)}h` : `${mins} min`}.` }, { status: 429 });
    }

    const [gym, gam, prs] = await Promise.all([
      getDocument(`gyms/${gymId}`, { revalidate: 300 }),
      getDocument(`gyms/${gymId}/gamification/${uid}`, { idToken: token }),
      listDocuments(`gyms/${gymId}/personalRecords/${uid}/records`, token, 50),
    ]);
    const tz = String(gym?.timezone ?? DEFAULT_TZ);
    const today = dateKey(new Date(), tz);
    // Plan for this week if it's early in the week, otherwise next week.
    const weekOf = weekdayOfKey(today) <= 2 ? mondayOf(today) : addDays(mondayOf(today), 7);

    const input: CoachInput = {
      firstName: String(user.firstName ?? "there"),
      goals: (user.fitnessGoals as string[]) ?? [],
      usualTrainingTime: String(user.usualTrainingTime ?? "Varies"),
      currentStreakDays: Number(gam?.currentStreakDays ?? 0),
      longestStreakDays: Number(gam?.longestStreakDays ?? 0),
      totalVisits: Number(gam?.totalVisits ?? 0),
      visitsThisMonth: gam?.monthKey === today.slice(0, 7) ? Number(gam?.visitsThisMonth ?? 0) : 0,
      prs: prs.map((p) => ({ exercise: String(p.exercise), value: Number(p.value), unit: p.unit === "lb" ? "lb" : "kg", date: String(p.date) })),
      weekOf,
    };

    let plan: PlanOutput;
    let generator: "claude" | "rules" = "rules";
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const client = new Anthropic();
        const res = await client.messages.parse({
          model: process.env.ANTHROPIC_MODEL || "claude-opus-5",
          max_tokens: 16000,
          output_config: { effort: "medium", format: zodOutputFormat(PlanSchema) },
          system: SYSTEM,
          messages: [{ role: "user", content: coachPrompt(input) }],
        });
        if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error(`No plan (${res.stop_reason})`);
        plan = res.parsed_output;
        generator = "claude";
      } catch (e) {
        console.warn("[coach] LLM failed, using rules plan:", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e instanceof Error ? e.message : e);
        plan = rulesPlan(input);
      }
    } else {
      plan = rulesPlan(input);
    }

    const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    plan.days.sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
    const id = await createDocument(`${plansPath}/plans`, { weekOf, headline: plan.headline, rationale: plan.rationale, days: plan.days, generator }, token, ["createdAt"]);
    return NextResponse.json({ id, generator });
  } catch (e) {
    recent.delete(uid);
    console.error("[coach]", e);
    return NextResponse.json({ error: "Couldn't build your plan right now. Try again in a minute." }, { status: 500 });
  }
}
