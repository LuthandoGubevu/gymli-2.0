"use client";
import { useMemo, useState } from "react";
import { CalendarDays, Check, Clock, Hourglass, Plus } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { useCelebrate } from "@/components/providers/celebration";
import { Button } from "@/components/ui/button";
import { EmptyState, Meter, PageHeader, Skeleton } from "@/components/ui/bits";
import { Segmented } from "@/components/ui/segmented";
import { useClasses, useMyBookings, useSlots } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-today";
import { bookClass, cancelBooking } from "@/lib/actions/classes";
import { fillToken } from "@/lib/crowd";
import { addDays, dayKeyOf, fmtKey, minutesOf } from "@/lib/dates";
import { toast, toastError } from "@/lib/toast";
import type { ClassBooking, ClassSlot, GymClass } from "@/lib/types";
import { cn, errorMessage, fullName } from "@/lib/utils";
import { SubTabs } from "./progress-tabs";

export const BOOKING_WINDOW_DAYS = 7;

export const CLASS_TABS = [{ value: "/app/classes", label: "Classes" }, { value: "/app/trainers", label: "Trainers" }];

export function ClassesPage() {
  const { me, gymId } = useMe();
  const { key: today, parts } = useToday();
  const celebrate = useCelebrate();
  const [day, setDay] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const last = today ? addDays(today, BOOKING_WINDOW_DAYS - 1) : null;
  const classes = useClasses(gymId);
  const slots = useSlots(gymId, today, last);
  const bookings = useMyBookings(gymId, me.uid, today);

  const days = useMemo(() => (today ? Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(today, i)) : []), [today]);
  if (!today || !parts) return <Skeleton className="h-96 rounded-xl" />;

  const selected = day ?? today;
  const slotMap = new Map(slots.data.map((s) => [s.id, s]));
  const myMap = new Map(bookings.data.filter((b) => b.status !== "cancelled").map((b) => [b.slotId, b]));
  const nowMin = parts.hour * 60 + parts.minute;
  const booked = bookings.data.filter((b) => b.status === "confirmed" && (b.date > today || (b.date === today && minutesOf(b.time) >= nowMin))).length;
  const waiting = bookings.data.filter((b) => b.status === "waitlisted").length;
  const dayClasses = classes.data.filter((c) => c.day === dayKeyOf(selected)).sort((a, b) => a.time.localeCompare(b.time));
  const nextDayWithClasses = days.find((d) => d !== selected && classes.data.some((c) => c.day === dayKeyOf(d)));

  const onAction = async (c: GymClass, slot: ClassSlot | undefined, mine: ClassBooking | undefined) => {
    const id = `${c.id}_${selected}`;
    setPending(id);
    try {
      if (mine) {
        const { promoted } = await cancelBooking(gymId, mine);
        toast(mine.status === "waitlisted" ? "Left the waitlist" : `Cancelled ${c.name} · ${promoted ? "next on the waitlist is in" : "spot released"}`, "x", "muted");
      } else {
        const r = await bookClass(gymId, { uid: me.uid, name: fullName(me) }, c, selected);
        if (r.status === "confirmed") {
          celebrate({
            kind: "class", icon: "calendar-check", eyebrow: "Class booked", big: c.time, title: `You're in — ${c.name}`,
            sub: `${selected === today ? "Today" : fmtKey(selected, "weekdayDay")}${c.room ? ` · ${c.room}` : ""}${c.coach ? ` with ${c.coach.split(" ")[0]}` : ""}. ${r.spotsLeft === 0 ? "You got the last spot." : `${r.spotsLeft} spot${r.spotsLeft === 1 ? "" : "s"} left.`}`,
            primary: "Done",
          });
        } else {
          toast(`You're #${r.position} on the waitlist — we'll ping you if a spot opens`, "hourglass", "warning");
        }
      }
    } catch (e) {
      toastError(errorMessage(e));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SubTabs tabs={CLASS_TABS} label="Classes and trainers" />
      <PageHeader
        eyebrow={`Classes · ${fmtKey(today, "dayMonth")} – ${fmtKey(last!, "dayMonth")}`}
        title="Book your week"
        actions={<span className="font-mono text-[13px] font-medium text-muted-foreground">{booked} booked · {waiting} waitlisted</span>}
      />
      <Segmented ariaLabel="Day" grid className="w-full rounded-lg" value={selected} onChange={setDay}
        options={days.map((d) => ({ value: d, label: dayKeyOf(d), sub: d === today ? "Today" : fmtKey(d, "dayMonth") }))} />

      {classes.loading ? <Skeleton className="h-24 rounded-xl" /> : dayClasses.length ? (
        <ul className="flex flex-col gap-3" aria-label={`Classes on ${fmtKey(selected, "weekdayDay")}`}>
          {dayClasses.map((c) => {
            const slotId = `${c.id}_${selected}`;
            const slot = slotMap.get(slotId);
            const mine = myMap.get(slotId);
            const cap = slot?.capacity ?? c.capacity;
            const count = slot?.confirmedCount ?? 0;
            const wait = slot?.waitlistOrder.length ?? 0;
            const past = selected === today && minutesOf(c.time) < nowMin;
            const full = count >= cap;
            const left = cap - count;
            const ratio = cap ? count / cap : 0;
            const pos = mine?.status === "waitlisted" ? (slot?.waitlistOrder.indexOf(me.uid) ?? -1) + 1 || mine.waitlistPosition : null;
            let btn: { label: string; icon: typeof Plus; variant: "primary" | "success" | "warning" | "outline"; aria: string };
            if (past) btn = { label: "Done", icon: Check, variant: "outline", aria: `${c.name} has finished` };
            else if (mine?.status === "confirmed") btn = { label: "Booked", icon: Check, variant: "success", aria: `Booked for ${c.name}. Cancel booking` };
            else if (mine?.status === "waitlisted") btn = { label: `Waitlist #${pos}`, icon: Hourglass, variant: "warning", aria: `Waitlist position ${pos} for ${c.name}. Leave waitlist` };
            else if (full) btn = { label: "Join waitlist", icon: Clock, variant: "outline", aria: `${c.name} is full. Join waitlist` };
            else btn = { label: "Book", icon: Plus, variant: "primary", aria: `Book ${c.name} at ${c.time}` };
            return (
              <li key={c.id} className={cn("surface flex flex-wrap items-center gap-x-7 gap-y-4 px-6 py-5", past && "opacity-55")}>
                <div className="flex w-[72px] flex-col gap-1">
                  <span className="font-mono text-[22px] font-semibold leading-none tracking-[-0.02em]">{c.time}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.durationMin} min</span>
                </div>
                <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1">
                  <span className="font-display text-lg font-semibold leading-tight">{c.name}</span>
                  <span className="text-sm text-muted-foreground">{[c.coach, c.room].filter(Boolean).join(" · ")}</span>
                </div>
                <div className="flex min-w-[140px] flex-[0_1_180px] flex-col gap-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">{past ? "Finished" : full ? (wait ? `Full · ${wait} waiting` : "Full") : `${left} spot${left === 1 ? "" : "s"} left`}</span>
                    <span className="font-mono">{count}/{cap}</span>
                  </div>
                  <Meter value={ratio * 100} color={`hsl(var(--${fillToken(ratio)}))`} height={6} label={`${c.name} capacity`} />
                </div>
                <Button variant={btn.variant} size="lg" disabled={past || pending === slotId} aria-label={btn.aria}
                  className="min-w-[140px] flex-none font-semibold" onClick={() => onAction(c, slot, mine)}>
                  <btn.icon size={16} strokeWidth={2.25} aria-hidden />{pending === slotId ? "…" : btn.label}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<CalendarDays size={26} />} title="No classes on this day" sub="The floor's open as usual." action={
          nextDayWithClasses ? <Button size="lg" onClick={() => setDay(nextDayWithClasses)}>See {dayKeyOf(nextDayWithClasses) === dayKeyOf(today) ? "next week" : fmtKey(nextDayWithClasses, "weekdayDay")}</Button> : undefined
        } />
      )}
    </div>
  );
}
