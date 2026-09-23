"use client";
import { Check, UserCheck, X } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Pill, Skeleton } from "@/components/ui/bits";
import { SubTabs } from "@/components/member/progress-tabs";
import { useAllTrainerBookings } from "@/hooks/use-data";
import { decideTrainerBooking } from "@/lib/actions/admin";
import { fmtKey, relativeTime } from "@/lib/dates";
import { toast, toastError } from "@/lib/toast";
import type { TrainerBooking } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { BOOKING_TABS } from "./tabs";

const PILL: Record<string, string> = { accepted: "soft-success", declined: "soft-destructive", cancelled: "border-border text-muted-foreground", pending: "soft-warning" };

export function TrainerRequestsAdmin() {
  const { gymId } = useMe();
  const reqs = useAllTrainerBookings(gymId);
  const pending = reqs.data.filter((r) => r.status === "pending").sort((a, b) => (a.requestedDate + a.requestedTime).localeCompare(b.requestedDate + b.requestedTime));
  const decided = reqs.data.filter((r) => r.status !== "pending").slice(0, 30);
  const decide = async (b: TrainerBooking, s: "accepted" | "declined") => {
    try { await decideTrainerBooking(gymId, b, s); toast(s === "accepted" ? `Confirmed — ${b.userName.split(" ")[0]} has been notified` : "Declined — member notified", s === "accepted" ? "check" : "x", s === "accepted" ? "success" : "muted"); }
    catch (e) { toastError(errorMessage(e)); }
  };
  return (
    <div className="flex flex-col gap-6">
      <SubTabs tabs={BOOKING_TABS} label="Bookings" />
      <PageHeader eyebrow="Admin · Trainer requests" title={pending.length ? `${pending.length} waiting on you` : "All caught up"} />
      {reqs.loading ? <Skeleton className="h-40 rounded-xl" /> : pending.length ? (
        <ul className="flex flex-col gap-3">
          {pending.map((b) => (
            <li key={b.id} className="surface flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-5">
              <div className="flex w-[130px] flex-col"><span className="font-mono text-sm font-semibold">{fmtKey(b.requestedDate, "weekdayDay")}</span><span className="font-mono text-[13px] text-muted-foreground">{b.requestedTime}</span></div>
              <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
                <span className="font-semibold">{b.userName} <span className="font-normal text-muted-foreground">with</span> {b.trainerName}</span>
                {b.note ? <span className="text-sm text-muted-foreground">“{b.note}”</span> : null}
                <span className="font-mono text-xs text-muted-foreground">Requested {b.createdAt ? relativeTime(b.createdAt.toDate()).toLowerCase() : "just now"}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => decide(b, "declined")}><X size={16} aria-hidden />Decline</Button>
                <Button onClick={() => decide(b, "accepted")}><Check size={16} aria-hidden />Accept</Button>
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={<UserCheck size={26} />} title="No pending requests" sub="Members' personal-training requests show up here for you to accept or decline." />}
      {decided.length ? (
        <div className="surface overflow-hidden">
          <table className="w-full text-sm">
            <caption className="px-6 pt-5 text-left"><span className="eyebrow">Recent decisions</span></caption>
            <tbody>
              {decided.map((b) => (
                <tr key={b.id} className="border-t border-border first:border-0">
                  <td className="px-6 py-3 font-mono text-[13px] text-muted-foreground">{fmtKey(b.requestedDate, "weekdayDay")} {b.requestedTime}</td>
                  <td className="py-3">{b.userName} · {b.trainerName}</td>
                  <td className="px-6 py-3 text-right"><Pill className={`${PILL[b.status]} px-2 py-0.5 text-xs capitalize`}>{b.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
