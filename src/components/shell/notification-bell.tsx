"use client";
import Link from "next/link";
import { Bell, CalendarCheck, Heart, Megaphone, UserCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/use-data";
import { markNotificationRead, markNotificationsRead } from "@/lib/actions/notices";
import { relativeTime } from "@/lib/dates";
import type { NotificationType } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON: Record<NotificationType, typeof Bell> = { waitlist_promoted: CalendarCheck, buddy_match: Heart, buddy_message: Heart, trainer_booking: UserCheck, notice: Megaphone };

export function NotificationBell({ uid, className }: { uid: string; className?: string }) {
  const { data } = useNotifications(uid);
  const unread = data.filter((n) => !n.readAt);
  return (
    <Popover>
      <PopoverTrigger
        aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"}
        className={cn("relative grid h-10 w-10 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground", className)}
      >
        <Bell size={19} />
        {unread.length ? (
          <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold text-primary-foreground">{unread.length > 9 ? "9+" : unread.length}</span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-display text-[15px] font-semibold">Notifications</span>
          {unread.length ? (
            <button type="button" className="text-[13px] font-medium text-accent-ink hover:underline" onClick={() => markNotificationsRead(uid, unread.map((n) => n.id))}>Mark all read</button>
          ) : null}
        </div>
        <div className="max-h-[360px] overflow-y-auto p-1.5">
          {data.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing yet. Waitlist promotions and Gym Buddy matches show up here.</p>
          ) : data.map((n) => {
            const I = ICON[n.type] ?? Bell;
            return (
              <Link key={n.id} href={n.link || "/app"} onClick={() => { if (!n.readAt) markNotificationRead(uid, n.id).catch(() => {}); }}
                className="flex gap-3 rounded-lg px-3 py-2.5 text-foreground no-underline hover:bg-card hover:no-underline">
                <span className={cn("mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full", n.readAt ? "bg-card text-muted-foreground" : "bg-primary-soft text-accent-ink")} aria-hidden><I size={16} /></span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-sm", n.readAt ? "font-medium" : "font-semibold")}>{n.title}</span>
                    <span className="flex-none font-mono text-[11px] text-muted-foreground">{n.createdAt ? relativeTime(n.createdAt.toDate()) : ""}</span>
                  </span>
                  {n.body ? <span className="line-clamp-2 text-[13px] text-muted-foreground">{n.body}</span> : null}
                </span>
                {!n.readAt ? <span className="mt-2 h-2 w-2 flex-none rounded-full bg-primary" aria-label="Unread" /> : null}
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
