"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { NotebookPen, Plus, Scale, Trash2 } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHead, MiniEmpty, PageHeader } from "@/components/ui/bits";
import { Field, errProps } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useBodyMetrics, useWorkoutLogs } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-today";
import { addBodyMetric, addWorkout, deleteBodyMetric, deleteWorkout } from "@/lib/actions/logs";
import { fmtKey } from "@/lib/dates";
import { toast, toastError } from "@/lib/toast";
import { errorMessage } from "@/lib/utils";
import { ProgressTabs } from "./progress-tabs";

const TYPES = ["Strength", "Conditioning", "Class", "Cardio", "Mobility", "Sport", "Other"];
const workoutSchema = z.object({
  type: z.string().min(1),
  durationMin: z.coerce.number<number>({ message: "Enter minutes." }).int("Whole minutes.").min(1, "At least 1 minute.").max(600, "Max 600 minutes."),
  date: z.string().min(1, "Pick a date."),
  notes: z.string().trim().max(500, "Keep notes under 500 characters."),
});
const weightSchema = z.object({
  weight: z.coerce.number<number>({ message: "Enter a weight." }).gt(0, "Enter a weight above 0.").lt(700),
  unit: z.enum(["kg", "lb"]),
  date: z.string().min(1, "Pick a date."),
});

export function LogPage() {
  const { me, gymId } = useMe();
  const { key: today } = useToday();
  const logs = useWorkoutLogs(gymId, me.uid);
  const metrics = useBodyMetrics(gymId, me.uid);
  const wf = useForm<z.infer<typeof workoutSchema>>({ resolver: zodResolver(workoutSchema), values: { type: "Strength", durationMin: 60, date: today ?? "", notes: "" }, resetOptions: { keepDirtyValues: true } });
  const mf = useForm<z.infer<typeof weightSchema>>({ resolver: zodResolver(weightSchema), values: { weight: undefined as unknown as number, unit: "kg", date: today ?? "" }, resetOptions: { keepDirtyValues: true } });
  const latest = metrics.data[0];

  return (
    <div className="flex flex-col gap-6">
      <ProgressTabs />
      <PageHeader eyebrow="Workout log" title="What you did, when" sub="Manual for now — the same log will take imports from Apple Health, Google Fit or Strava later." />
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
        <Card className="gap-4">
          <CardHead title="Log a workout" />
          <form className="flex flex-col gap-4" noValidate onSubmit={wf.handleSubmit(async (v) => {
            try { await addWorkout(gymId, me.uid, v); wf.reset({ ...v, notes: "" }); toast("Workout logged", "check", "success"); } catch (e) { toastError(errorMessage(e)); }
          })}>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Type" htmlFor="w-type"><NativeSelect id="w-type" className="bg-background" {...wf.register("type")}>{TYPES.map((t) => <option key={t}>{t}</option>)}</NativeSelect></Field>
              <Field label="Minutes" htmlFor="w-min" error={wf.formState.errors.durationMin?.message}><Input type="number" inputMode="numeric" className="bg-background font-mono" {...errProps("w-min", wf.formState.errors.durationMin?.message)} {...wf.register("durationMin")} /></Field>
              <Field label="Date" htmlFor="w-date" error={wf.formState.errors.date?.message}><Input type="date" max={today ?? undefined} className="bg-background px-2 font-mono text-sm" {...errProps("w-date", wf.formState.errors.date?.message)} {...wf.register("date")} /></Field>
            </div>
            <Field label="Notes" htmlFor="w-notes" error={wf.formState.errors.notes?.message}><Textarea rows={2} placeholder="Optional — how it felt, what you hit" className="min-h-[72px] bg-background" {...errProps("w-notes", wf.formState.errors.notes?.message)} {...wf.register("notes")} /></Field>
            <Button type="submit" className="self-start" disabled={wf.formState.isSubmitting}><Plus size={16} aria-hidden />Add workout</Button>
          </form>
        </Card>
        <Card className="gap-4">
          <CardHead title="Body weight" right={latest ? `Latest ${latest.weight} ${latest.unit}` : undefined} />
          <form className="flex flex-col gap-4" noValidate onSubmit={mf.handleSubmit(async (v) => {
            try { await addBodyMetric(gymId, me.uid, v); mf.reset({ ...v, weight: undefined as unknown as number }); toast("Weight logged", "check", "success"); } catch (e) { toastError(errorMessage(e)); }
          })}>
            <div className="grid grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] gap-3">
              <Field label="Weight" htmlFor="m-w" error={mf.formState.errors.weight?.message}><Input type="number" step="0.1" inputMode="decimal" className="bg-background font-mono" {...errProps("m-w", mf.formState.errors.weight?.message)} {...mf.register("weight")} /></Field>
              <Field label="Unit" htmlFor="m-unit"><NativeSelect id="m-unit" className="bg-background font-mono" {...mf.register("unit")}><option>kg</option><option>lb</option></NativeSelect></Field>
              <Field label="Date" htmlFor="m-date"><Input type="date" max={today ?? undefined} className="bg-background px-2 font-mono text-sm" {...mf.register("date")} /></Field>
            </div>
            <Button type="submit" className="self-start" disabled={mf.formState.isSubmitting}><Scale size={16} aria-hidden />Add weigh-in</Button>
          </form>
          {metrics.data.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {metrics.data.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="font-mono text-muted-foreground">{fmtKey(m.date)}</span>
                  <span className="flex-1 font-mono font-medium">{m.weight} {m.unit}</span>
                  <Button variant="ghost" size="icon" aria-label={`Delete weigh-in from ${fmtKey(m.date)}`} onClick={() => deleteBodyMetric(gymId, me.uid, m.id).catch((e) => toastError(errorMessage(e)))}><Trash2 size={15} /></Button>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>
      <Card className="gap-3">
        <CardHead title="History" right={`${logs.data.length} workouts`} />
        {logs.data.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {logs.data.map((w) => (
              <li key={w.id} className="flex items-start gap-4 py-3">
                <span className="w-[92px] flex-none font-mono text-[13px] text-muted-foreground">{fmtKey(w.date)}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium">{w.type} <span className="font-mono text-[13px] font-normal text-muted-foreground">· {w.durationMin} min</span></span>
                  {w.notes ? <span className="text-sm text-muted-foreground">{w.notes}</span> : null}
                </div>
                <Button variant="ghost" size="icon" aria-label={`Delete ${w.type} workout from ${fmtKey(w.date)}`} onClick={() => deleteWorkout(gymId, me.uid, w.id).catch((e) => toastError(errorMessage(e)))}><Trash2 size={15} /></Button>
              </li>
            ))}
          </ul>
        ) : <MiniEmpty icon={<NotebookPen size={22} />} text="No workouts logged yet." />}
      </Card>
    </div>
  );
}
