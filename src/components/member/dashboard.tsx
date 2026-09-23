"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { useGym } from "@/components/providers/gym";
import { Skeleton } from "@/components/ui/bits";
import { useCheckInStats, useBadges, useClasses, useGamification, useLeaderboard, useMyBookings, useOccupancy, usePlans, usePRs, useRecentVisits } from "@/hooks/use-data";
import { useNoticeState } from "@/hooks/use-unread";
import { useToday } from "@/hooks/use-today";
import { thresholdsOf } from "@/lib/crowd";
import { addDays, fmtKey, greeting, minutesOf } from "@/lib/dates";
import { displayGamification } from "@/lib/streaks";
import { rankLeaderboard } from "@/lib/leaderboard";
import { CheckInButton } from "./check-in-button";
import { BadgesStrip, BusiestTodayCard, CoachCard, CrowdCard, LatestPRCard, NextClassCard, NoticesCard, RankCard, StreakCard } from "./dashboard-cards";
import { PRDialog } from "./pr-dialog";

export function Dashboard() {
  const { me, gymId } = useMe();
  const { gym } = useGym();
  const { key: today, parts, now } = useToday();
  const t = useMemo(() => thresholdsOf(gym), [gym]);
  const crowd = useOccupancy(gymId, t);
  const gam = useGamification(gymId, me.uid);
  const prs = usePRs(gymId, me.uid);
  const badges = useBadges(gymId, me.uid);
  const notices = useNoticeState(me);
  const classes = useClasses(gymId);
  const bookings = useMyBookings(gymId, me.uid, today);
  const visits = useRecentVisits(gymId, me.uid, today ? addDays(today, -6) : null);
  const stats = useCheckInStats(gymId, today);
  const plans = usePlans(gymId, me.uid);
  const month = today?.slice(0, 7) ?? "";
  const board = useLeaderboard(gymId, month || "0000-00");
  const [prOpen, setPrOpen] = useState(false);

  if (!today || !parts || !now) return <DashboardSkeleton />;

  const g = displayGamification(gam.data, today);
  const visitedKeys = new Set(visits.data.map((v) => v.dateKey));
  const ranked = rankLeaderboard(board.data);
  const myRank = me.leaderboardOptIn ? (ranked.findIndex((e) => e.uid === me.uid) + 1 || null) : null;
  const nowMin = parts.hour * 60 + parts.minute;
  const next = bookings.data
    .filter((b) => b.status === "confirmed" && (b.date > today || (b.date === today && minutesOf(b.time) >= nowMin)))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0] ?? null;
  const nextCls = next ? classes.data.find((c) => c.id === next.classId) ?? null : null;
  const todayStats = stats.data.find((s) => s.dateKey === today);
  const offerLive = !gym.offerExpiry || gym.offerExpiry >= today;
  const promo = offerLive ? [gym.generalNotice, ...gym.promoTags].filter(Boolean) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-[18px]">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="eyebrow">{fmtKey(today, "weekdayDay")} · {String(parts.hour).padStart(2, "0")}:{String(parts.minute).padStart(2, "0")}</span>
          <h1 className="page-title">{greeting(parts.hour)}, {me.firstName}</h1>
          <p className="text-[15px] leading-normal text-muted-foreground">{crowd.loading ? " " : crowd.message}</p>
        </div>
        <CheckInButton />
      </div>

      {promo.length ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-primary/35 bg-primary-soft px-4 py-3 text-sm">
          <Megaphone size={16} className="text-accent-ink" aria-hidden />
          {gym.generalNotice && offerLive ? <span className="font-medium">{gym.generalNotice}</span> : null}
          {gym.promoTags.map((p) => <span key={p} className="rounded-full border border-primary/40 px-2.5 py-0.5 font-mono text-xs text-accent-ink">{p}</span>)}
          {gym.offerExpiry ? <span className="ml-auto font-mono text-xs text-muted-foreground">Until {fmtKey(gym.offerExpiry, "dayMonth")}</span> : null}
        </div>
      ) : null}

      <div className="auto-grid">
        <CrowdCard crowd={crowd} />
        <StreakCard g={g} visitedKeys={visitedKeys} today={today} visitedToday={g.visitedToday} />
        <RankCard visitsThisMonth={g.visitsThisMonth} myRank={myRank} month={month} />
      </div>
      <div className="auto-grid">
        <NextClassCard booking={next} cls={nextCls} today={today} />
        <LatestPRCard prs={prs.data} onLog={() => setPrOpen(true)} />
        <NoticesCard notices={notices.notices} isUnread={notices.isUnread} unread={notices.unread} />
      </div>
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
        <BusiestTodayCard hours={todayStats?.hours ?? {}} openHour={gym.openHour} closeHour={gym.closeHour} nowHour={parts.hour} />
        <CoachCard plan={plans.data[0]} today={today} />
      </div>
      <BadgesStrip earned={badges.data} g={g} prCount={prs.data.length} />
      {!me.leaderboardOptIn ? (
        <p className="text-[13px] text-muted-foreground">You&apos;re not on the leaderboard. <Link href="/app/leaderboard">Turn it on</Link> to see your rank.</p>
      ) : null}
      <PRDialog open={prOpen} onOpenChange={setPrOpen} prs={prs.data} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-72" />
      <div className="auto-grid">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[230px] rounded-xl" />)}</div>
    </div>
  );
}
