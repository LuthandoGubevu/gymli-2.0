"use client";
import { useState } from "react";
import { ListOrdered } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { useGym } from "@/components/providers/gym";
import { Avatar, EmptyState, PageHeader, Skeleton } from "@/components/ui/bits";
import { Switch } from "@/components/ui/switch";
import { useGamification, useLeaderboard } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-today";
import { updateProfile } from "@/lib/actions/profile";
import { monthName } from "@/lib/dates";
import { rankLeaderboard } from "@/lib/leaderboard";
import { toast, toastError } from "@/lib/toast";
import { cn, errorMessage } from "@/lib/utils";
import { ProgressTabs } from "./progress-tabs";

export function LeaderboardPage() {
  const { me, gymId } = useMe();
  const { gym } = useGym();
  const { key: today } = useToday();
  const month = today?.slice(0, 7) ?? null;
  const board = useLeaderboard(gymId, month ?? "0000-00");
  const gam = useGamification(gymId, me.uid);
  const [saving, setSaving] = useState(false);

  const toggle = async (on: boolean) => {
    setSaving(true);
    try {
      await updateProfile(me, { leaderboardOptIn: on }, { timezone: gym.timezone, gamification: gam.data });
      toast(on ? "You're on the board" : "Removed from the board", "check", on ? "success" : "muted");
    } catch (e) { toastError(errorMessage(e)); } finally { setSaving(false); }
  };

  if (!month) return <Skeleton className="h-96 rounded-xl" />;
  const rows = rankLeaderboard(board.data);

  return (
    <div className="flex flex-col gap-6">
      <ProgressTabs />
      <PageHeader eyebrow={`Leaderboard · ${monthName(month)} ${month.slice(0, 4)}`} title="Who's showing up" actions={
        <label htmlFor="lb-optin" className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
          <Switch id="lb-optin" checked={me.leaderboardOptIn} onCheckedChange={toggle} disabled={saving} />
          Show me on the board
        </label>
      } />
      {board.loading ? <Skeleton className="h-72 rounded-xl" /> : rows.length ? (
        <div className="surface overflow-hidden">
          <table className="w-full">
            <caption className="sr-only">Leaderboard for {monthName(month)}</caption>
            <thead>
              <tr className="border-b border-border font-mono text-[11px] font-medium uppercase tracking-[.08em] text-muted-foreground">
                <th scope="col" className="w-14 py-3.5 pl-[22px] text-left font-medium">Rank</th>
                <th scope="col" className="px-3 py-3.5 text-left font-medium">Member</th>
                <th scope="col" className="w-20 px-2 py-3.5 text-right font-medium">Visits</th>
                <th scope="col" className="w-20 py-3.5 pr-[22px] text-right font-medium">Streak</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => {
                const mine = e.uid === me.uid;
                return (
                  <tr key={e.uid} className={cn("border-b border-border last:border-0", mine && "bg-primary-soft")} aria-current={mine ? "true" : undefined}>
                    <td className={cn("py-3.5 pl-[22px] font-mono text-base font-semibold", i < 3 ? "text-accent-ink" : "text-muted-foreground")}>{String(i + 1).padStart(2, "0")}</td>
                    <td className="max-w-0 px-3 py-3.5">
                      <span className="flex min-w-0 items-center gap-3"><Avatar initials={e.initials} size={34} /><span className={cn("truncate text-[15px]", mine ? "font-semibold" : "font-medium")}>{e.displayName}{mine ? " (you)" : ""}</span></span>
                    </td>
                    <td className="px-2 py-3.5 text-right font-mono text-base font-semibold">{e.visits}</td>
                    <td className="py-3.5 pr-[22px] text-right font-mono text-sm text-muted-foreground">{e.streak}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<ListOrdered size={26} />} title="Nobody's on the board yet" sub="The first check-in of the month takes the top spot." />
      )}
      <p className="text-[13px] text-muted-foreground">Ranked by visits this month, then current streak. Only members who opt in are listed. Weights are never shown.</p>
    </div>
  );
}
