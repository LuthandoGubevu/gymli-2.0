"use client";
import { useMemo, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { Button } from "@/components/ui/button";
import { EmptyState, Meter, PageHeader, Pill, Skeleton } from "@/components/ui/bits";
import { Segmented } from "@/components/ui/segmented";
import { SubTabs } from "@/components/member/progress-tabs";
import { useAllBookings, useClasses, useSlots } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-today";
import { cancelBooking } from "@/lib/actions/classes";
import { fillToken } from "@/lib/crowd";
import { addDays, dayKeyOf, fmtKey } from "@/lib/dates";
import { toast, toastError } from "@/lib/toast";
import type { ClassBooking } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { BOOKING_TABS } from "./tabs";

export function BookingsAdmin() {
  const { gymId } = useMe();
  const { key: today } = useToday();
  const [day, setDay] = useState<string | null>(null);
  const classes = useClasses(gymId);
  const slots = useSlots(gymId, today, today ? addDays(today, 6) : null);
  const bookings = useAllBookings(gymId, today);
  const days = useMemo(() => (today ? Array.from({ length: 7 }, (_, i) => addDays(today, i)) : []), [today]);
  if (!today) return <Skeleton className="h-96 rounded-xl" />;
  const sel = day ?? today;
  const dayClasses = classes.data.filter((c) => c.day === dayKeyOf(sel)).sort((a, b) => a.time.localeCompare(b.time));

  const cancel = async (b: ClassBooking) => {
    if (!window.confirm(`Cancel ${b.userName}'s ${b.status === "waitlisted" ? "waitlist spot" : "booking"} for ${b.className}?`)) return;
    try { const r = await cancelBooking(gymId, b); toast(r.promoted ? "Cancelled — next on the waitlist was promoted" : "Booking cancelled", "x", "muted"); }
    catch (e) { toastError(errorMessage(e)); }
  };

  return (
    <div className="flex flex-col gap-6">
      <SubTabs tabs={BOOKING_TABS} label="Bookings" />
      <PageHeader eyebrow="Admin · Bookings" title="Who's booked in" />
      <Segmented ariaLabel="Day" grid className="w-full rounded-lg" value={sel} onChange={setDay}
        options={days.map((d) => ({ value: d, label: dayKeyOf(d), sub: d === today ? "Today" : fmtKey(d, "dayMonth") }))} />
      {classes.loading || bookings.loading ? <Skeleton className="h-48 rounded-xl" /> : dayClasses.length ? (
        <ul className="flex flex-col gap-4">
          {dayClasses.map((c) => {
            const slotId = `${c.id}_${sel}`;
            const slot = slots.data.find((s) => s.id === slotId);
            const list = bookings.data.filter((b) => b.slotId === slotId && b.status !== "cancelled");
            const confirmed = list.filter((b) => b.status === "confirmed");
            const order = slot?.waitlistOrder ?? [];
            const waiting = list.filter((b) => b.status === "waitlisted").sort((a, b) => order.indexOf(a.userId) - order.indexOf(b.userId));
            const cap = slot?.capacity ?? c.capacity;
            const count = slot?.confirmedCount ?? 0;
            return (
              <li key={c.id} className="surface flex flex-col gap-4 p-6">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <span className="font-mono text-xl font-semibold">{c.time}</span>
                  <div className="flex min-w-0 flex-1 flex-col"><span className="font-display text-lg font-semibold">{c.name}</span><span className="text-sm text-muted-foreground">{[c.coach, c.room].filter(Boolean).join(" · ")}</span></div>
                  <div className="flex w-44 flex-col gap-1.5">
                    <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">{order.length ? `${order.length} waiting` : "Confirmed"}</span><span className="font-mono">{count}/{cap}</span></div>
                    <Meter value={cap ? (count / cap) * 100 : 0} color={`hsl(var(--${fillToken(cap ? count / cap : 0)}))`} height={6} label={`${c.name} fill`} />
                  </div>
                </div>
                {list.length ? (
                  <table className="w-full text-sm">
                    <caption className="sr-only">Bookings for {c.name}</caption>
                    <thead><tr className="border-b border-border font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground"><th scope="col" className="py-2 text-left font-medium">Member</th><th scope="col" className="py-2 text-left font-medium">Status</th><th scope="col" className="w-12 py-2"><span className="sr-only">Actions</span></th></tr></thead>
                    <tbody>
                      {[...confirmed, ...waiting].map((b) => (
                        <tr key={b.id} className="border-b border-border last:border-0">
                          <td className="py-2 font-medium">{b.userName || "Member"}</td>
                          <td className="py-2">{b.status === "confirmed" ? <Pill className="soft-success px-2 py-0.5 text-xs">Booked</Pill> : <Pill className="soft-warning px-2 py-0.5 text-xs">Waitlist #{order.indexOf(b.userId) + 1 || b.waitlistPosition}</Pill>}</td>
                          <td className="py-1 text-right"><Button variant="ghost" size="icon" aria-label={`Cancel ${b.userName}'s booking`} onClick={() => cancel(b)}><X size={16} /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-sm text-muted-foreground">No bookings yet.</p>}
              </li>
            );
          })}
        </ul>
      ) : <EmptyState icon={<CalendarDays size={26} />} title="No classes on this day" sub="Add classes under Manage → Classes." />}
    </div>
  );
}
