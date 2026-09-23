"use client";
import Link from "next/link";
import { useMemo } from "react";
import { CalendarDays, Check, ChevronRight, Flame, Inbox, Plus, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHead, CardLink, LiveBadge, Meter, MiniEmpty, Pill } from "@/components/ui/bits";
import { BADGE_ICONS, RANK_ICONS } from "@/components/icons";
import { BADGES, badgeInputs, badgeProgress } from "@/lib/badges";
import { RANKS, rankFor } from "@/lib/ranks";
import { addDays, dayKeyOf, fmtKey, monthName, relativeTime } from "@/lib/dates";
import type { CrowdInfo } from "@/lib/crowd";
import type { ClassBooking, EarnedBadge, Gamification, GymClass, Notice, PersonalRecord, WorkoutPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CrowdCard({ crowd }: { crowd: CrowdInfo & { loading: boolean } }) {
  return (
    <CardLink href="/app/crowd" label={`Live crowd: ${crowd.count} members in, ${crowd.level}. Open crowd meter.`} className="gap-5">
      <CardHead title="Live crowd" right={<LiveBadge />} />
      <div className="flex items-baseline gap-2.5">
        <span className="num font-display text-[72px] font-bold leading-[.9]">{crowd.loading ? "–" : crowd.count}</span>
        <span className="whitespace-nowrap text-[15px] text-muted-foreground">members in</span>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <Pill className={crowd.softClass} dot={crowd.color}>{crowd.level}</Pill>
          <span className="font-mono text-xs text-muted-foreground">{crowd.pct}% of capacity</span>
        </div>
        <Meter value={crowd.pct} color={crowd.color} label="Crowd level" />
      </div>
    </CardLink>
  );
}

export function StreakCard({ g, visitedKeys, today, visitedToday }: { g: Gamification; visitedKeys: Set<string>; today: string; visitedToday: boolean }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return (
    <Card className="gap-5">
      <CardHead title="Streak" right={`Best ${g.longestStreakDays}`} />
      <div className="flex items-baseline gap-2.5">
        <span className="num font-display text-[72px] font-bold leading-[.9]">{g.currentStreakDays}</span>
        <span className="whitespace-nowrap text-[15px] text-muted-foreground">{g.currentStreakDays === 1 ? "day in a row" : "days in a row"}</span>
        <Flame size={30} className="ml-auto self-center text-accent-ink" aria-hidden />
      </div>
      <ol className="grid grid-cols-7 gap-1.5" aria-label="Last 7 days">
        {days.map((k) => {
          const isToday = k === today;
          const done = isToday ? visitedToday : visitedKeys.has(k);
          return (
            <li key={k} className="flex flex-col items-center gap-1.5">
              <span
                className={cn("grid aspect-square w-full max-w-[34px] place-items-center rounded-md text-primary-foreground transition-colors duration-300", done ? "bg-primary" : isToday ? "border-[1.5px] border-dashed border-primary/60" : "bg-muted")}
                aria-label={`${fmtKey(k, "weekdayDay")}: ${done ? "visited" : isToday ? "not yet" : "missed"}`}
              >
                {done ? <Check size={14} strokeWidth={3} aria-hidden /> : null}
              </span>
              <span className={cn("font-mono text-[11px] font-medium", isToday ? "text-accent-ink" : "text-muted-foreground")} aria-hidden>{dayKeyOf(k)[0]}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export function RankCard({ visitsThisMonth, myRank, month }: { visitsThisMonth: number; myRank: number | null; month: string }) {
  const r = rankFor(visitsThisMonth);
  const Icon = RANK_ICONS[r.current.icon];
  return (
    <CardLink href="/app/leaderboard" label={`Rank ${r.current.name}. Open leaderboard.`} className="gap-[18px]">
      <CardHead title={`Rank · ${monthName(month)}`} right={myRank ? `#${myRank} on board` : "Not on board"} />
      <div className="flex items-center gap-3.5">
        <span className="grid h-[52px] w-[52px] place-items-center rounded-lg bg-primary-soft text-accent-ink" aria-hidden><Icon size={26} /></span>
        <div className="flex flex-col gap-1">
          <span className="font-display text-[30px] font-bold leading-none tracking-[-0.03em]">{r.current.name}</span>
          <span className="font-mono text-[13px] text-muted-foreground">{visitsThisMonth} visits this month</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[13px] text-muted-foreground"><span>{r.needText}</span><span className="font-mono text-accent-ink">{r.pct}%</span></div>
        <Meter value={r.pct} label="Progress to next rank" />
      </div>
      <ol className="flex justify-between gap-1" aria-label="Rank ladder">
        {RANKS.map((x, i) => {
          const I = RANK_ICONS[x.icon];
          return (
            <li key={x.name} className={cn("flex flex-col items-center gap-1", i === r.idx ? "text-accent-ink" : i < r.idx ? "text-foreground" : "text-muted-foreground")}>
              <I size={16} aria-hidden />
              <span className="whitespace-nowrap font-mono text-[10px] font-medium">{x.name}</span>
            </li>
          );
        })}
      </ol>
    </CardLink>
  );
}

export function NextClassCard({ booking, cls, today }: { booking: ClassBooking | null; cls: GymClass | null; today: string }) {
  return (
    <Card className="gap-4">
      <CardHead title="Next class" />
      {booking ? (
        <>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[40px] font-semibold leading-none tracking-[-0.03em]">{booking.time}</span>
            <span className="font-mono text-[13px] font-medium text-muted-foreground">{booking.date === today ? "Today" : fmtKey(booking.date, "weekdayDay")}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-display text-lg font-semibold">{booking.className}</span>
            {cls ? <span className="text-sm text-muted-foreground">{[cls.coach, cls.room].filter(Boolean).join(" · ")}</span> : null}
          </div>
          <Button asChild variant="outline" size="md" className="mt-auto self-start">
            <Link href="/app/classes" className="text-foreground no-underline hover:no-underline">All classes <ChevronRight size={16} aria-hidden /></Link>
          </Button>
        </>
      ) : (
        <MiniEmpty icon={<CalendarDays size={22} />} text="Nothing booked this week." action={
          <Button asChild size="md"><Link href="/app/classes" className="text-primary-foreground no-underline hover:no-underline">Browse classes</Link></Button>
        } />
      )}
    </Card>
  );
}

export function LatestPRCard({ prs, onLog }: { prs: PersonalRecord[]; onLog: () => void }) {
  const latest = useMemo(() => [...prs].sort((a, b) => b.date.localeCompare(a.date))[0], [prs]);
  const delta = latest && latest.previousValue != null ? Math.round((latest.value - latest.previousValue) * 10) / 10 : null;
  return (
    <Card className="gap-4">
      <CardHead title="Latest PR" right={`${prs.length} logged`} />
      {latest ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="num font-display text-[56px] font-bold leading-[.9]">{latest.value}</span>
            <span className="font-display text-lg font-medium text-muted-foreground">{latest.unit}</span>
            {delta != null ? <span className="soft-success ml-auto rounded-full px-[9px] py-1 font-mono text-xs font-semibold">+{delta} {latest.unit}</span> : null}
          </div>
          <div className="flex justify-between gap-2"><span className="text-base font-semibold">{latest.exercise}</span><span className="font-mono text-[13px] text-muted-foreground">{fmtKey(latest.date)}</span></div>
          <Button variant="outline" size="md" onClick={onLog} className="mt-auto self-start"><Plus size={16} aria-hidden />Log a PR</Button>
        </>
      ) : (
        <MiniEmpty icon={<Trophy size={22} />} text="No PRs yet. Your first one sets the bar." action={<Button size="md" onClick={onLog}>Log a PR</Button>} />
      )}
    </Card>
  );
}

export function NoticesCard({ notices, isUnread, unread }: { notices: Notice[]; isUnread: (n: Notice) => boolean; unread: number }) {
  const top = notices.slice(0, 2);
  return (
    <Card className="gap-3.5">
      <CardHead title="Notices" right={unread ? <span className="font-semibold text-accent-ink">{unread} new</span> : undefined} />
      {top.length ? (
        <>
          <ul className="flex flex-col">
            {top.map((n) => (
              <li key={n.id}>
                <Link href={`/app/notices#${n.id}`} className="-mx-3 flex gap-3 rounded-[10px] p-3 text-foreground no-underline transition-colors hover:bg-elevated hover:no-underline">
                  <span className={cn("mt-[7px] h-2 w-2 flex-none rounded-full", isUnread(n) ? "bg-primary" : "bg-muted")} aria-label={isUnread(n) ? "Unread" : undefined} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex justify-between gap-2"><span className="text-[15px] font-semibold">{n.title}</span><span className="flex-none font-mono text-xs text-muted-foreground">{n.createdAt ? relativeTime(n.createdAt.toDate()) : ""}</span></span>
                    <span className="line-clamp-2 text-sm leading-[1.45] text-muted-foreground">{n.body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/app/notices" className="mt-auto text-sm font-medium">All notices →</Link>
        </>
      ) : (
        <MiniEmpty icon={<Inbox size={22} />} text="All quiet from the front desk." />
      )}
    </Card>
  );
}

export function BusiestTodayCard({ hours, openHour, closeHour, nowHour }: { hours: Record<string, number>; openHour: number; closeHour: number; nowHour: number }) {
  const bars = [];
  for (let h = openHour; h <= Math.min(closeHour, nowHour); h++) bars.push({ h, n: hours[String(h).padStart(2, "0")] ?? 0 });
  const max = Math.max(1, ...bars.map((b) => b.n));
  const total = bars.reduce((a, b) => a + b.n, 0);
  return (
    <Card className="gap-[18px]">
      <CardHead title="Busiest times · today" right={`${total} check-ins`} />
      {bars.length ? (
        <div className="flex h-[150px] items-end gap-1.5" role="img" aria-label={`Check-ins by hour today. Busiest: ${bars.reduce((a, b) => (b.n > a.n ? b : a), bars[0]).h}:00.`}>
          {bars.map((b) => (
            <div key={b.h} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="font-mono text-[10px] font-medium text-muted-foreground">{b.n || ""}</span>
              <div className={cn("w-full rounded-[5px_5px_2px_2px] transition-[height] duration-500", b.h === nowHour ? "bg-primary" : "bg-primary/35")} style={{ height: `${Math.max(3, (b.n / max) * 100)}%` }} />
              <span className="h-3 font-mono text-[10px] text-muted-foreground">{b.h % 2 === 1 ? String(b.h).padStart(2, "0") : ""}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted-foreground">The gym opens at {String(openHour).padStart(2, "0")}:00.</p>}
      <Link href="/app/crowd" className="text-sm font-medium">Forecast & 8-week heatmap →</Link>
    </Card>
  );
}

export function CoachCard({ plan, today }: { plan: WorkoutPlan | undefined; today: string }) {
  const todayPlan = plan?.days.find((d) => d.day === dayKeyOf(today));
  return (
    <Card className="gap-4">
      <CardHead title="AI coach" right={plan ? `Week of ${fmtKey(plan.weekOf, "dayMonth")}` : undefined} />
      {plan ? (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="font-display text-lg font-semibold leading-snug">{plan.headline}</span>
            {todayPlan ? (
              <span className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Today · {todayPlan.focus}.</span> {todayPlan.summary}</span>
            ) : <span className="text-sm text-muted-foreground">Rest day today — {plan.days.length} sessions this week.</span>}
          </div>
          <Button asChild variant="outline" size="md" className="mt-auto self-start"><Link href="/app/coach" className="text-foreground no-underline hover:no-underline">See the full week <ChevronRight size={16} aria-hidden /></Link></Button>
        </>
      ) : (
        <MiniEmpty icon={<Sparkles size={22} />} text="Get a weekly plan built from your goals, streak and PRs." action={
          <Button asChild size="md"><Link href="/app/coach" className="text-primary-foreground no-underline hover:no-underline">Build my week</Link></Button>
        } />
      )}
    </Card>
  );
}

export function BadgesStrip({ earned, g, prCount }: { earned: EarnedBadge[]; g: Gamification; prCount: number }) {
  const ids = new Set(earned.map((e) => e.id));
  const inputs = badgeInputs(g, prCount);
  const earnedDefs = BADGES.filter((b) => ids.has(b.id));
  const next = BADGES.filter((b) => !ids.has(b.id)).map((b) => ({ b, p: badgeProgress(b, inputs) })).sort((a, b) => b.p.ratio - a.p.ratio)[0];
  return (
    <CardLink href="/app/badges" label={`Badges: ${earnedDefs.length} of ${BADGES.length} earned. Open badges.`} className="flex-row flex-wrap items-center gap-x-8 gap-y-5">
      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Badges</span>
        <span className="font-display text-[28px] font-bold leading-none tracking-[-0.02em]">{earnedDefs.length}<span className="font-medium text-muted-foreground"> / {BADGES.length}</span></span>
      </div>
      <div className="flex flex-1 flex-wrap gap-2.5">
        {earnedDefs.length ? earnedDefs.map((b) => {
          const I = BADGE_ICONS[b.icon];
          return <span key={b.id} title={b.name} className="grid h-12 w-12 place-items-center rounded-full border border-primary/30 bg-primary-soft text-accent-ink"><I size={22} aria-label={b.name} /></span>;
        }) : <span className="text-sm text-muted-foreground">Check in to earn your first badge.</span>}
      </div>
      <div className="flex min-w-[200px] flex-col gap-2">
        <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Next: {next ? next.b.name : "All earned"}</span><span className="font-mono">{next ? `${next.p.val} / ${next.b.goal}` : `${BADGES.length} / ${BADGES.length}`}</span></div>
        <Meter value={next ? next.p.ratio * 100 : 100} height={6} label="Progress to next badge" />
      </div>
    </CardLink>
  );
}
