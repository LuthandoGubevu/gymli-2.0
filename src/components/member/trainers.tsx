"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clock, Dumbbell, UserCheck } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { Button } from "@/components/ui/button";
import { Avatar, Card, CardHead, EmptyState, PageHeader, Pill, Skeleton } from "@/components/ui/bits";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FieldError, errProps } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useMyTrainerBookings, useTrainers } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-today";
import { cancelTrainerRequest, requestTrainerSession } from "@/lib/actions/trainers";
import { fmtKey } from "@/lib/dates";
import { toast, toastError } from "@/lib/toast";
import type { Trainer, TrainerBookingStatus } from "@/lib/types";
import { errorMessage, fullName, initialsFromName } from "@/lib/utils";
import { CLASS_TABS } from "./classes";
import { SubTabs } from "./progress-tabs";

const STATUS: Record<TrainerBookingStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "soft-warning" }, accepted: { label: "Confirmed", cls: "soft-success" },
  declined: { label: "Declined", cls: "soft-destructive" }, cancelled: { label: "Cancelled", cls: "border-border text-muted-foreground" },
};

const schema = z.object({
  date: z.string().min(1, "Pick a date."),
  time: z.string().regex(/^[0-2]\d:[0-5]\d$/, "Pick a time."),
  note: z.string().trim().max(500, "Keep it under 500 characters."),
});
type Values = z.infer<typeof schema>;

export function TrainersPage() {
  const { me, gymId } = useMe();
  const { key: today } = useToday();
  const trainers = useTrainers(gymId);
  const mine = useMyTrainerBookings(gymId, me.uid);
  const [target, setTarget] = useState<Trainer | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { date: "", time: "07:00", note: "" } });
  const [formError, setFormError] = useState("");

  const open = (t: Trainer) => { setFormError(""); reset({ date: today ?? "", time: "07:00", note: "" }); setTarget(t); };
  const onSubmit = async (v: Values) => {
    if (!target) return;
    try {
      await requestTrainerSession(gymId, { uid: me.uid, name: fullName(me) }, target, v);
      setTarget(null);
      toast(`Request sent to ${target.name.split(" ")[0]} — you'll get a notification when it's confirmed`, "calendar", "accent");
    } catch (e) { setFormError(errorMessage(e)); }
  };

  const upcoming = mine.data.filter((b) => today && b.requestedDate >= today && b.status !== "cancelled").sort((a, b) => (a.requestedDate + a.requestedTime).localeCompare(b.requestedDate + b.requestedTime));

  return (
    <div className="flex flex-col gap-6">
      <SubTabs tabs={CLASS_TABS} label="Classes and trainers" />
      <PageHeader eyebrow="Personal training" title="Book a trainer" sub="Request a session — the front desk confirms it with the trainer." />

      {upcoming.length ? (
        <Card className="gap-3">
          <CardHead title="Your requests" />
          <ul className="flex flex-col divide-y divide-border">
            {upcoming.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="font-mono text-sm">{fmtKey(b.requestedDate, "weekdayDay")} · {b.requestedTime}</span>
                <span className="flex-1 font-medium">{b.trainerName}</span>
                <Pill className={STATUS[b.status].cls}>{STATUS[b.status].label}</Pill>
                {b.status === "pending" ? (
                  <Button variant="ghost" size="sm" onClick={() => cancelTrainerRequest(gymId, b.id).then(() => toast("Request cancelled", "x", "muted")).catch((e) => toastError(errorMessage(e)))}>Cancel</Button>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {trainers.loading ? <Skeleton className="h-48 rounded-xl" /> : trainers.data.length ? (
        <ul className="auto-grid">
          {trainers.data.map((t) => (
            <li key={t.id} className="surface flex flex-col gap-4 p-6">
              <div className="flex items-center gap-3.5">
                <Avatar initials={initialsFromName(t.name)} size={52} photoURL={t.avatarUrl} />
                <div className="flex flex-col gap-1">
                  <span className="font-display text-lg font-semibold">{t.name}</span>
                  <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground"><Clock size={13} aria-hidden />{t.availability}</span>
                </div>
              </div>
              {t.bio ? <p className="text-sm leading-normal text-muted-foreground">{t.bio}</p> : null}
              <ul className="flex flex-wrap gap-1.5" aria-label="Specialties">
                {t.specialties.map((s) => <li key={s} className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">{s}</li>)}
              </ul>
              <Button className="mt-auto self-start" onClick={() => open(t)}><UserCheck size={16} aria-hidden />Request a session</Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Dumbbell size={26} />} title="No trainers listed yet" sub="Ask the front desk about personal training." />
      )}

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) setTarget(null); }}>
        <DialogContent title={`Session with ${target?.name ?? ""}`} description={target?.availability}>
          <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" htmlFor="tr-date" error={errors.date?.message}>
                <Input type="date" min={today ?? undefined} className="bg-background font-mono" {...errProps("tr-date", errors.date?.message)} {...register("date")} />
              </Field>
              <Field label="Time" htmlFor="tr-time" error={errors.time?.message}>
                <Input type="time" step={900} className="bg-background font-mono" {...errProps("tr-time", errors.time?.message)} {...register("time")} />
              </Field>
            </div>
            <Field label="What do you want to work on?" htmlFor="tr-note" error={errors.note?.message}>
              <Textarea rows={3} placeholder="e.g. Deadlift technique check" className="bg-background" {...errProps("tr-note", errors.note?.message)} {...register("note")} />
            </Field>
            <FieldError>{formError}</FieldError>
            <div className="flex justify-end gap-2.5">
              <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send request"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
