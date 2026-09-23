"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Hourglass, MapPin, Megaphone, UserCheck, UserPlus } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { useGym } from "@/components/providers/gym";
import { Button } from "@/components/ui/button";
import { Card, CardHead, Meter, PageHeader, Pill, Skeleton } from "@/components/ui/bits";
import { useAllTrainerBookings, useCheckInStats, useClasses, useMemberProfiles, useOccupancy, useSlots } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-today";
import { fillToken, thresholdsOf } from "@/lib/crowd";
import { addDays, dayKeyOf, fmtKey, minutesOf } from "@/lib/dates";

const BrandBarChart = dynamic(() => import("./bar-chart").then((m) => m.BrandBarChart), { ssr: false, loading: () => <Skeleton className="h-[200px]" /> });
const hh = (h: number) => String(h).padStart(2, "0");

export function AdminOverview() {
  const { gymId } = useMe();
  const { gym } = useGym();
  const { key: today, parts, now } = useToday();
  const t = useMemo(() => thresholdsOf(gym), [gym]);
  const crowd = useOccupancy(gymId, t);
  const stats = useCheckInStats(gymId, today ? addDays(today, -14) : null);
  const members = useMemberProfiles(gymId);
  const classes = useClasses(gymId);
  const slots = useSlots(gymId, today, today ? addDays(today, 6) : null);
  const trainerReqs = useAllTrainerBookings(gymId);

  if (!today || !parts || !now) return <Skeleton className="h-96 rounded-xl" />;

  const byDay = new Map(stats.data.map((s) => [s.dateKey, s]));
  const todayStats = byDay.get(today);
  const lastWeek = byDay.get(addDays(today, -7));
  const lastWeekSoFar = lastWeek ? Object.entries(lastWeek.hours).filter(([h]) => Number(h) <= parts.hour).reduce((a, [, n]) => a + n, 0) : 0;
  const todayTotal = todayStats?.total ?? 0;
  const delta = lastWeekSoFar ? Math.round(((todayTotal - lastWeekSoFar) / lastWeekSoFar) * 100) : null;
  const weekAgo = now.getTime() - 7 * 86400000;
  const newThisWeek = members.data.filter((m) => (m.createdAt?.toMillis?.() ?? 0) > weekAgo).length;
  const nowMin = parts.hour * 60 + parts.minute;
  const upcoming = slots.data
    .map((s) => ({ s, c: classes.data.find((c) => c.id === s.classId) }))
    .filter((x) => x.c && (x.s.date > today || minutesOf(x.c.time) >= nowMin))
    .sort((a, b) => (a.s.date + a.c!.time).localeCompare(b.s.date + b.c!.time));
  const waitTotal = upcoming.reduce((a, x) => a + x.s.waitlistOrder.length, 0);
  const pending = trainerReqs.data.filter((b) => b.status === "pending").length;

  const hourly = Array.from({ length: Math.max(0, Math.min(gym.closeHour, parts.hour) - gym.openHour + 1) }, (_, i) => gym.openHour + i)
    .map((h) => ({ label: hh(h), full: `${hh(h)}:00–${hh(h)}:59`, value: todayStats?.hours[hh(h)] ?? 0, highlight: h === parts.hour }));
  const daily = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
    .map((k) => ({ label: k === today ? "Today" : fmtKey(k, "dayMonth"), full: fmtKey(k, "weekdayDay"), value: byDay.get(k)?.total ?? 0, highlight: k === today }));

  const tiles = [
    { label: "Check-ins today", value: String(todayTotal), sub: delta === null ? "No data for last week yet" : `${delta >= 0 ? "+" : ""}${delta}% vs last ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][parts.weekday]} so far`, icon: MapPin },
    { label: "New this week", value: `+${newThisWeek}`, sub: `${members.data.length} members total`, icon: UserPlus },
    { label: "Waitlisted", value: String(waitTotal), sub: `across ${upcoming.filter((x) => x.s.waitlistOrder.length).length} upcoming classes`, icon: Hourglass },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={`Admin · ${fmtKey(today, "weekdayDay")}`} title="Today at the gym" actions={
        <Button asChild size="xl" glow><Link href="/app/admin/notices"><Megaphone size={18} aria-hidden />Post a notice</Link></Button>
      } />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
        <Card className="gap-3 p-[22px]">
          <div className="flex items-center justify-between"><span className="eyebrow">Live occupancy</span><span className="live-dot" aria-label="Live" /></div>
          <span className="num font-display text-[56px] font-bold leading-[.9]">{crowd.loading ? "–" : crowd.count}</span>
          <Pill className={`${crowd.softClass} self-start px-[9px] py-[3px] text-xs`}>{crowd.level} · {crowd.pct}%</Pill>
        </Card>
        {tiles.map((x) => (
          <Card key={x.label} className="gap-3 p-[22px]">
            <div className="flex items-center justify-between text-muted-foreground"><span className="eyebrow">{x.label}</span><x.icon size={18} aria-hidden /></div>
            <span className="num font-display text-[56px] font-bold leading-[.9]">{x.value}</span>
            <span className="text-[13px] text-muted-foreground">{x.sub}</span>
          </Card>
        ))}
      </div>
      {pending ? (
        <Link href="/app/admin/trainer-requests" className="soft-warning flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold no-underline hover:no-underline">
          <UserCheck size={18} aria-hidden />{pending} trainer session request{pending === 1 ? "" : "s"} waiting for a decision →
        </Link>
      ) : null}
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
        <Card className="gap-[18px]">
          <CardHead title="Check-ins by hour" right={`${hh(gym.openHour)}:00 – now`} />
          {hourly.length ? <BrandBarChart data={hourly} unit="check-ins" caption="Check-ins by hour today" /> : <p className="text-sm text-muted-foreground">Opens at {hh(gym.openHour)}:00.</p>}
        </Card>
        <Card className="gap-[18px]">
          <CardHead title="Daily check-ins · 14 days" right={`${daily.reduce((a, d) => a + d.value, 0)} total`} />
          <BrandBarChart data={daily} unit="check-ins" caption="Daily check-ins, last 14 days" />
        </Card>
      </div>
      <Card className="gap-4">
        <CardHead title="Class fill · next 7 days" right={`${waitTotal} on waitlists`} />
        {upcoming.length ? (
          <ul className="flex flex-col gap-4">
            {upcoming.slice(0, 10).map(({ s, c }) => {
              const r = s.capacity ? s.confirmedCount / s.capacity : 0;
              return (
                <li key={s.id} className="grid grid-cols-[96px_minmax(0,1fr)_72px] items-center gap-3">
                  <span className="font-mono text-[13px] font-medium text-muted-foreground">{s.date === today ? "Today" : dayKeyOf(s.date)} {c!.time}</span>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="truncate text-sm font-semibold">{c!.name}{s.waitlistOrder.length ? <span className="font-normal text-warning"> · {s.waitlistOrder.length} waiting</span> : null}</span>
                    <Meter value={r * 100} color={`hsl(var(--${fillToken(r)}))`} height={6} label={`${c!.name} fill`} />
                  </div>
                  <span className="text-right font-mono text-sm font-medium">{s.confirmedCount}/{s.capacity}</span>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No bookings in the next 7 days yet. <Link href="/app/admin/classes">Manage the schedule</Link>.</p>}
      </Card>
    </div>
  );
}
