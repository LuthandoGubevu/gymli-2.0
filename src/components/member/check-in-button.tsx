"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/components/providers/auth";
import { useGym } from "@/components/providers/gym";
import { useCelebrate } from "@/components/providers/celebration";
import { useBadges, useMyPresence } from "@/hooks/use-data";
import { checkIn, checkOut } from "@/lib/actions/checkin";
import { celebrateCheckIn } from "@/lib/celebrations";
import { timeHHmm } from "@/lib/dates";
import { toast, toastError } from "@/lib/toast";
import { cn, errorMessage } from "@/lib/utils";

export function useCheckInAction() {
  const { me } = useMe();
  const { gym } = useGym();
  const celebrate = useCelebrate();
  const router = useRouter();
  const badges = useBadges(me.gymId, me.uid);
  const presence = useMyPresence(me.gymId, me.uid);
  const [busy, setBusy] = useState(false);
  const active = !!presence.data?.isActive;
  const since = presence.data?.lastCheckInAt?.toDate?.() ?? null;

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await checkIn(gym, me, "manual");
      celebrateCheckIn(celebrate, r, "Checked in", { earnedBefore: badges.data.length, goBadges: () => router.push("/app/badges") });
    } catch (e) {
      toastError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const out = async () => {
    try { await checkOut(me.gymId, me.uid); toast("Checked out — see you next time", "map-pin", "muted"); }
    catch (e) { toastError(errorMessage(e)); }
  };
  return { run, out, busy, active, since, loading: presence.loading, tz: gym.timezone };
}

/** Header CTA: gold Check in (with glow), or a success pill once checked in. */
export function CheckInButton({ compact }: { compact?: boolean }) {
  const { run, out, busy, active, since, loading, tz } = useCheckInAction();
  if (loading) return <div className={cn("rounded-md bg-muted/60", compact ? "h-11 w-32" : "h-[52px] w-36")} aria-hidden />;
  if (active) {
    return (
      <div className="flex items-center gap-2">
        {compact ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success"><Check size={16} strokeWidth={2.5} aria-hidden />You&apos;re in</span>
        ) : (
          <span className="soft-success inline-flex h-[52px] animate-gy-pop items-center gap-2 rounded-md border px-[18px] text-[15px] font-semibold">
            <Check size={18} strokeWidth={2.5} aria-hidden />Checked in{since ? <> · <span className="font-mono">{timeHHmm(since, tz)}</span></> : null}
          </span>
        )}
        <Button variant="ghost" size="md" onClick={out}>Check out</Button>
      </div>
    );
  }
  return (
    <Button size={compact ? "lg" : "hero"} glow onClick={run} disabled={busy}>
      <MapPin size={compact ? 18 : 20} aria-hidden />{busy ? "Checking in…" : "Check in"}
    </Button>
  );
}
