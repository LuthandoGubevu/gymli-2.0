"use client";
import { useMemo, useState } from "react";
import { useMe } from "@/components/providers/auth";
import { useGym } from "@/components/providers/gym";
import { Card, CardHead, PageHeader, Skeleton } from "@/components/ui/bits";
import { Switch } from "@/components/ui/switch";
import { useCheckInStats, useGamification, useOccupancy } from "@/hooks/use-data";
import { useToday } from "@/hooks/use-today";
import { levelRanges, thresholdsOf } from "@/lib/crowd";
import { averageGrid, bestWindow, eightWeeksAgo } from "@/lib/forecast";
import { updateProfile } from "@/lib/actions/profile";
import { toast, toastError } from "@/lib/toast";
import { cn, errorMessage } from "@/lib/utils";
import { CheckInButton } from "./check-in-button";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const hh = (h: number) => String(h).padStart(2, "0");

export function CrowdMeter() {
  const { me, gymId } = useMe();
  const { gym } = useGym();
  const { key: today, parts } = useToday();
  const t = useMemo(() => thresholdsOf(gym), [gym]);
  const crowd = useOccupancy(gymId, t);
  const stats = useCheckInStats(gymId, today ? eightWeeksAgo(today) : null);
  const gam = useGamification(gymId, me.uid);
  const [savingAuto, setSavingAuto] = useState(false);
  const grid = useMemo(() => averageGrid(stats.data, today ?? undefined), [stats.data, today]);

  if (!today || !parts) return <Skeleton className="h-96 rounded-xl" />;

  const wd = parts.weekday;
  const row = grid[wd];
  const max = Math.max(1, ...grid.flat());
  const rowMax = Math.max(1, ...row.slice(gym.openHour, gym.closeHour + 1));
  const win = bestWindow(row, parts.hour + 1, gym.openHour, gym.closeHour, 2);
  const peakHour = row.reduce((best, v, h) => (h >= gym.openHour && h <= gym.closeHour && v > row[best] ? h : best), gym.openHour);
  const dash = `${((crowd.pct / 100) * 314.16).toFixed(1)} 400`;
  const hasHistory = stats.data.length > 1;
  const geoReady = gym.latitude !== null && gym.longitude !== null;

  const toggleAuto = async (on: boolean) => {
    if (on && !geoReady) { toastError("Your gym hasn't set its location yet — ask the front desk."); return; }
    setSavingAuto(true);
    try {
      if (on && "permissions" in navigator) {
        await new Promise<void>((resolve, reject) => navigator.geolocation.getCurrentPosition(() => resolve(), (e) => reject(new Error(e.code === 1 ? "Location permission was denied." : e.message)), { timeout: 15000 }));
      }
      await updateProfile(me, { autoPresenceEnabled: on }, { timezone: gym.timezone, gamification: gam.data });
      toast(on ? `Auto check-in on — within ${gym.geofenceRadiusM} m of the gym` : "Auto check-in off", "map-pin", "accent");
    } catch (e) {
      toastError(errorMessage(e));
    } finally {
      setSavingAuto(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Crowd meter" title="How busy is it right now?" />
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
        <Card className="gap-[22px] px-6 pb-6 pt-7">
          <div className="relative mx-auto w-full max-w-[320px]">
            <svg viewBox="0 0 240 132" className="block w-full overflow-visible" role="img" aria-label={`${crowd.count} members in, ${crowd.level}, ${crowd.pct}% of capacity`}>
              <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="hsl(var(--muted))" strokeWidth={16} strokeLinecap="round" />
              <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke={crowd.color} strokeWidth={16} strokeLinecap="round" strokeDasharray={dash}
                style={{ transition: "stroke-dasharray 800ms cubic-bezier(.2,.8,.2,1), stroke 400ms" }} />
            </svg>
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1" aria-hidden>
              <span className="num font-display text-[76px] font-bold leading-[.85]">{crowd.loading ? "–" : crowd.count}</span>
              <span className="text-[15px] font-semibold transition-colors duration-[400ms]" style={{ color: crowd.color }}>{crowd.level} · {crowd.pct}%</span>
            </div>
          </div>
          <ul className="grid grid-cols-4 gap-2">
            {levelRanges(t).map((l) => {
              const active = l.level === crowd.level;
              return (
                <li key={l.level} className={cn("flex flex-col gap-1.5 rounded-[10px] border p-2.5", active ? `soft-${l.token}` : "border-border")} aria-current={active ? "true" : undefined}>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground"><span className="h-[7px] w-[7px] rounded-full" style={{ background: `hsl(var(--${l.token}))` }} aria-hidden />{l.level}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{l.range}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-[18px]">
            <label htmlFor="auto-checkin" className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <Switch id="auto-checkin" checked={me.autoPresenceEnabled} onCheckedChange={toggleAuto} disabled={savingAuto} />
              Auto check-in
            </label>
            <div className="ml-auto"><CheckInButton compact /></div>
          </div>
        </Card>

        <Card className="gap-[18px]">
          <CardHead title="Today's forecast" right={LONG[wd]} />
          {hasHistory ? (
            <>
              <div className="flex flex-col gap-1">
                <span className="font-display text-xl font-semibold">{win ? `Best window: ${hh(win.start)}:00 – ${hh(win.start + 2)}:00` : "The gym's closing soon"}</span>
                <span className="text-sm text-muted-foreground">Usually busiest around {hh(peakHour)}:00 on {LONG[wd]}s.</span>
              </div>
              <div className="flex min-h-[160px] flex-1 items-end gap-[5px]" role="img" aria-label={`Typical crowd by hour on ${LONG[wd]}s`}>
                {Array.from({ length: gym.closeHour - gym.openHour + 1 }, (_, i) => gym.openHour + i).map((h) => {
                  const now = h === parts.hour;
                  return (
                    <div key={h} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <div className="w-full rounded-[5px_5px_2px_2px] transition-[height] duration-500" style={{ height: `${Math.max(4, (row[h] / rowMax) * 100)}%`, background: now ? crowd.color : h < parts.hour ? "hsl(var(--muted))" : "hsl(var(--primary) / .28)" }} />
                      <span className={cn("h-3 font-mono text-[10px]", now ? "text-foreground" : "text-muted-foreground")}>{now ? "NOW" : h % 3 === 0 ? hh(h) : ""}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground">We&apos;ll forecast the quiet hours once there&apos;s a week or two of check-ins.</p>}
        </Card>
      </div>

      <Card className="gap-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="eyebrow">Busiest times · last 8 weeks</h2>
          <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground" aria-hidden>Quiet<span className="h-2 w-20 rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)/.08),hsl(var(--primary)/.95))]" />Busy</span>
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[560px] table-fixed border-separate border-spacing-1">
            <caption className="sr-only">Average check-ins by weekday and hour over the last 8 weeks</caption>
            <thead>
              <tr>
                <th className="w-10"><span className="sr-only">Day</span></th>
                {Array.from({ length: gym.closeHour - gym.openHour + 1 }, (_, i) => gym.openHour + i).map((h) => (
                  <th key={h} scope="col" className="text-center font-mono text-[10px] font-normal text-muted-foreground">{h % 2 === 1 ? hh(h) : <span className="sr-only">{hh(h)}</span>}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d, di) => (
                <tr key={d}>
                  <th scope="row" className={cn("text-left font-mono text-[11px] font-medium", di === wd ? "text-accent-ink" : "text-muted-foreground")}>{d}</th>
                  {Array.from({ length: gym.closeHour - gym.openHour + 1 }, (_, i) => gym.openHour + i).map((h) => {
                    const v = grid[di][h] / max;
                    const cur = di === wd && h === parts.hour;
                    return (
                      <td key={h} title={`${d} ${hh(h)}:00 · ${Math.round(grid[di][h])} avg check-ins`} className="h-[26px] rounded-[5px]"
                        style={{ background: `hsl(var(--primary) / ${(0.06 + v * 0.9).toFixed(2)})`, outline: cur ? "2px solid hsl(var(--foreground))" : undefined, outlineOffset: 1 }}>
                        <span className="sr-only">{Math.round(grid[di][h])}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
