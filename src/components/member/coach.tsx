"use client";
import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useAuth, useMe } from "@/components/providers/auth";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/bits";
import { usePlans } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-today";
import { dayKeyOf, fmtKey, relativeTime } from "@/lib/dates";
import { toast, toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ProgressTabs } from "./progress-tabs";

export function CoachPage() {
  const { me, gymId } = useMe();
  const { user } = useAuth();
  const { key: today } = useToday();
  const plans = usePlans(gymId, me.uid);
  const [busy, setBusy] = useState(false);
  const plan = plans.data[0];

  const generate = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { authorization: `Bearer ${await user.getIdToken()}` } });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Couldn't build your plan.");
      toast("Your week is ready", "sparkles", "accent");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Couldn't build your plan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ProgressTabs />
      <PageHeader eyebrow={plan ? `AI coach · week of ${fmtKey(plan.weekOf, "dayMonth")}` : "AI coach"} title={plan ? plan.headline : "Your week, planned"}
        sub={plan ? undefined : "Built from your goals, your streak, your visits and your PRs — not generic filler."}
        actions={<Button size={plan ? "lg" : "xl"} variant={plan ? "outline" : "primary"} glow={!plan} onClick={generate} disabled={busy}>
          {plan ? <RefreshCw size={16} aria-hidden className={busy ? "animate-spin" : undefined} /> : <Sparkles size={18} aria-hidden />}
          {busy ? "Building your week…" : plan ? "Regenerate" : "Build my week"}
        </Button>} />
      {plans.loading ? <Skeleton className="h-64 rounded-xl" /> : plan ? (
        <>
          <Card className="gap-2">
            <p className="text-[15px] leading-[1.55] text-muted-foreground">{plan.rationale}</p>
            <span className="font-mono text-xs text-muted-foreground">Generated {plan.createdAt ? relativeTime(plan.createdAt.toDate()).toLowerCase() : "just now"} · {plan.generator === "claude" ? "AI coach" : "rules-based coach"} · one new plan every 6 hours</span>
          </Card>
          <ul className="auto-grid">
            {plan.days.map((d) => {
              const isToday = today ? dayKeyOf(today) === d.day : false;
              return (
                <li key={d.day} className={cn("surface flex flex-col gap-4 p-6", isToday && "border-primary/50")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="eyebrow">{d.day}{isToday ? " · today" : ""}</span>
                    {isToday ? <span className="h-2 w-2 rounded-full bg-primary" aria-hidden /> : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="font-display text-lg font-semibold">{d.focus}</h2>
                    <p className="text-sm text-muted-foreground">{d.summary}</p>
                  </div>
                  <ul className="flex flex-col divide-y divide-border">
                    {d.exercises.map((x) => (
                      <li key={x.name} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                        <span className="font-medium">{x.name}</span>
                        <span className="text-right font-mono text-[13px] text-muted-foreground">{x.prescription}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
          <p className="text-[13px] text-muted-foreground">Plans are suggestions, not medical advice. Listen to your body and check with a trainer if something hurts.</p>
        </>
      ) : (
        <EmptyState icon={<Sparkles size={26} />} title="No plan yet" sub={`Tell the coach to build your week — it'll use your ${me.fitnessGoals.join(", ").toLowerCase() || "goals"} and your real training data.`} />
      )}
    </div>
  );
}
