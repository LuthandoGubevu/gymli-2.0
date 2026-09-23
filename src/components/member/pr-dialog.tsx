"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, errProps } from "@/components/ui/field";
import { useMe } from "@/components/providers/auth";
import { useCelebrate } from "@/components/providers/celebration";
import { useBadges, useGamification } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-today";
import { editPR, exerciseKey, logPR, toKg } from "@/lib/actions/records";
import { celebrateBadges } from "@/lib/celebrations";
import { toast } from "@/lib/toast";
import type { PersonalRecord, WeightUnit } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";

const QUICK = ["Front Squat", "Hip Thrust", "Weighted Pull-up", "Back Squat"];

const schema = z.object({
  exercise: z.string().trim().min(2, "Enter an exercise name (2+ characters).").max(60),
  value: z.coerce.number<number>({ message: "Enter a weight above 0." }).gt(0, "Enter a weight above 0.").lt(2000, "That's a world record. Check the number."),
  unit: z.enum(["kg", "lb"]),
  date: z.string().min(1, "Pick the date you hit it."),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prs: PersonalRecord[];
  /** When set, the dialog edits this record (typo fix) instead of logging a new PR. */
  editing?: PersonalRecord | null;
}

export function PRDialog({ open, onOpenChange, prs, editing }: Props) {
  const { me, gymId } = useMe();
  const { key: today } = useToday();
  const celebrate = useCelebrate();
  const router = useRouter();
  const gam = useGamification(gymId, me.uid);
  const badges = useBadges(gymId, me.uid);
  const [formError, setFormError] = useState("");

  const { register, handleSubmit, reset, setValue, watch, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { exercise: "", value: undefined as unknown as number, unit: "kg", date: today ?? "" },
  });

  useEffect(() => {
    if (!open) return;
    setFormError("");
    reset(editing ? { exercise: editing.exercise, value: editing.value, unit: editing.unit, date: editing.date } : { exercise: "", value: undefined as unknown as number, unit: "kg", date: today ?? "" });
  }, [open, editing, reset, today]);

  const unit = watch("unit");

  const onSubmit = async (v: Values) => {
    setFormError("");
    try {
      if (editing) {
        await editPR(gymId, me.uid, editing.id, v);
        toast("Record updated", "check", "success");
        onOpenChange(false);
        return;
      }
      const existing = prs.find((p) => p.exerciseKey === exerciseKey(v.exercise));
      if (existing && toKg(v.value, v.unit) <= toKg(existing.value, existing.unit)) {
        setError("value", { message: `Your best is ${existing.value} ${existing.unit} — a PR has to beat it.` });
        return;
      }
      const r = await logPR(gymId, me.uid, existing, v, gam.data);
      onOpenChange(false);
      if (r.kind === "improved") {
        celebrate({ kind: "pr", icon: "trophy", eyebrow: "New personal record", big: `+${r.delta}`, unit: v.unit, title: `${r.record.exercise} — ${v.value} ${v.unit}`, sub: `Up from ${existing!.value} ${existing!.unit}. That's the one.`, primary: "Nice" });
      } else {
        celebrate({ kind: "pr", icon: "trophy", eyebrow: "First PR logged", big: String(v.value), unit: v.unit, title: r.record.exercise, sub: "Every lift from here gets measured against this one.", primary: "Nice" });
      }
      celebrateBadges(celebrate, r.newBadges, badges.data.length + r.newBadges.length, () => router.push("/app/badges"));
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Edit record" : "Log a personal record"} description={editing ? "Fix a typo or the date — this doesn't count as a new PR." : "PRs only go up — beat your best to log one."}>
        <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Exercise" htmlFor="pr-exercise" error={errors.exercise?.message}>
            <Input placeholder="e.g. Front Squat" list="pr-exercises" autoComplete="off" className="bg-background" {...errProps("pr-exercise", errors.exercise?.message)} {...register("exercise")} />
            <datalist id="pr-exercises">{prs.map((p) => <option key={p.id} value={p.exercise} />)}</datalist>
            {!editing ? (
              <div className="flex flex-wrap gap-1.5">
                {QUICK.map((q) => (
                  <button key={q} type="button" onClick={() => setValue("exercise", q, { shouldValidate: true })} className="h-8 rounded-full border border-border px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground">{q}</button>
                ))}
              </div>
            ) : null}
          </Field>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <Field label="Weight" htmlFor="pr-value">
              <Input type="number" step="0.5" inputMode="decimal" placeholder="100" className="bg-background font-mono text-base font-medium" {...errProps("pr-value", errors.value?.message)} {...register("value")} />
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium" id="pr-unit-label">Unit</span>
              <div role="radiogroup" aria-labelledby="pr-unit-label" className="flex h-[46px] gap-1 rounded-md border border-border bg-background p-1">
                {(["kg", "lb"] as WeightUnit[]).map((u) => (
                  <button key={u} type="button" role="radio" aria-checked={unit === u} onClick={() => setValue("unit", u)}
                    className={cn("w-12 rounded-[5px] font-mono text-sm font-semibold", unit === u ? "bg-elevated text-foreground" : "text-muted-foreground")}>{u}</button>
                ))}
              </div>
            </div>
          </div>
          {errors.value?.message ? <div className="-mt-2"><FieldError id="pr-value-error">{errors.value.message}</FieldError></div> : null}
          <Field label="Date" htmlFor="pr-date" error={errors.date?.message}>
            <Input type="date" max={today ?? undefined} className="bg-background font-mono" {...errProps("pr-date", errors.date?.message)} {...register("date")} />
          </Field>
          <FieldError>{formError}</FieldError>
          <div className="flex justify-end gap-2.5">
            <Button variant="outline" size="lg" className="h-[46px]" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="lg" className="h-[46px]" disabled={isSubmitting}>{isSubmitting ? "Saving…" : editing ? "Save changes" : "Save record"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
