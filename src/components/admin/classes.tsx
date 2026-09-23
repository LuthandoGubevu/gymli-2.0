"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/bits";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FieldError, errProps } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { SubTabs } from "@/components/member/progress-tabs";
import { useClasses } from "@/hooks/use-data";
import { deleteClass, saveClass } from "@/lib/actions/admin";
import { toast, toastError } from "@/lib/toast";
import { DAY_KEYS, type DayKey, type GymClass } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { MANAGE_TABS } from "./tabs";

const schema = z.object({
  name: z.string().trim().min(2, "Name needs 2+ characters.").max(60),
  day: z.enum(DAY_KEYS as [DayKey, ...DayKey[]]),
  time: z.string().regex(/^[0-2]\d:[0-5]\d$/, "Pick a start time."),
  durationMin: z.coerce.number<number>({ message: "Enter minutes." }).int().min(5, "At least 5 minutes.").max(300, "Max 300 minutes."),
  capacity: z.coerce.number<number>({ message: "Enter a capacity." }).int("Whole number.").min(1, "At least 1 spot.").max(500),
  coach: z.string().trim().max(60),
  room: z.string().trim().max(60),
});
type Values = z.infer<typeof schema>;
const EMPTY: Values = { name: "", day: "Mon", time: "18:00", durationMin: 45, capacity: 12, coach: "", room: "" };

export function ClassesAdmin() {
  const { gymId } = useMe();
  const classes = useClasses(gymId);
  const [editing, setEditing] = useState<GymClass | "new" | null>(null);
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const open = (c: GymClass | "new") => { setFormError(""); reset(c === "new" ? EMPTY : { name: c.name, day: c.day, time: c.time, durationMin: c.durationMin, capacity: c.capacity, coach: c.coach ?? "", room: c.room ?? "" }); setEditing(c); };
  const onSubmit = async (v: Values) => {
    try { await saveClass(gymId, editing === "new" || !editing ? null : editing.id, v); setEditing(null); toast(editing === "new" ? `Added ${v.name}` : `Saved ${v.name}`, "check", "success"); }
    catch (e) { setFormError(errorMessage(e)); }
  };
  const remove = async (c: GymClass) => {
    if (!window.confirm(`Delete ${c.name} (${c.day} ${c.time}) from the schedule? Existing bookings stay in history.`)) return;
    try { await deleteClass(gymId, c.id); toast(`Deleted ${c.name}`, "x", "muted"); } catch (e) { toastError(errorMessage(e)); }
  };

  return (
    <div className="flex flex-col gap-6">
      <SubTabs tabs={MANAGE_TABS} label="Manage" />
      <PageHeader eyebrow="Admin · Schedule" title="Weekly classes" sub="Recurring every week. Capacity changes apply to occurrences nobody has booked yet." actions={<Button size="xl" onClick={() => open("new")}><Plus size={18} aria-hidden />Add class</Button>} />
      {classes.loading ? <Skeleton className="h-64 rounded-xl" /> : classes.data.length ? (
        <div className="flex flex-col gap-5">
          {DAY_KEYS.map((d) => {
            const list = classes.data.filter((c) => c.day === d).sort((a, b) => a.time.localeCompare(b.time));
            if (!list.length) return null;
            return (
              <section key={d} className="surface overflow-hidden" aria-labelledby={`day-${d}`}>
                <h2 id={`day-${d}`} className="eyebrow border-b border-border px-6 py-3">{d}</h2>
                <ul>
                  {list.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border px-6 py-3.5 last:border-0">
                      <span className="w-14 font-mono font-semibold">{c.time}</span>
                      <span className="min-w-0 flex-1 font-semibold">{c.name}<span className="ml-2 text-sm font-normal text-muted-foreground">{[c.coach, c.room].filter(Boolean).join(" · ")}</span></span>
                      <span className="font-mono text-[13px] text-muted-foreground">{c.durationMin} min · {c.capacity} spots</span>
                      <span className="flex">
                        <Button variant="ghost" size="icon" aria-label={`Edit ${c.name} ${c.day} ${c.time}`} onClick={() => open(c)}><Pencil size={16} /></Button>
                        <Button variant="ghost" size="icon" aria-label={`Delete ${c.name} ${c.day} ${c.time}`} onClick={() => remove(c)}><Trash2 size={16} /></Button>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : <EmptyState icon={<CalendarDays size={26} />} title="No classes yet" sub="Add your weekly timetable and members can start booking." action={<Button size="lg" onClick={() => open("new")}>Add your first class</Button>} />}

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent title={editing === "new" ? "Add a class" : "Edit class"}>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Name" htmlFor="c-name" error={errors.name?.message}><Input className="bg-background" placeholder="e.g. HIIT" {...errProps("c-name", errors.name?.message)} {...register("name")} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Day" htmlFor="c-day"><NativeSelect id="c-day" className="bg-background" {...register("day")}>{DAY_KEYS.map((d) => <option key={d}>{d}</option>)}</NativeSelect></Field>
              <Field label="Start" htmlFor="c-time" error={errors.time?.message}><Input type="time" step={300} className="bg-background px-2 font-mono" {...errProps("c-time", errors.time?.message)} {...register("time")} /></Field>
              <Field label="Minutes" htmlFor="c-dur" error={errors.durationMin?.message}><Input type="number" className="bg-background font-mono" {...errProps("c-dur", errors.durationMin?.message)} {...register("durationMin")} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Capacity" htmlFor="c-cap" error={errors.capacity?.message}><Input type="number" className="bg-background font-mono" {...errProps("c-cap", errors.capacity?.message)} {...register("capacity")} /></Field>
              <Field label="Coach" htmlFor="c-coach" className="col-span-2"><Input id="c-coach" className="bg-background" {...register("coach")} /></Field>
            </div>
            <Field label="Room" htmlFor="c-room"><Input id="c-room" className="bg-background" placeholder="e.g. Studio A" {...register("room")} /></Field>
            <FieldError>{formError}</FieldError>
            <div className="flex justify-end gap-2.5"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save class"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
