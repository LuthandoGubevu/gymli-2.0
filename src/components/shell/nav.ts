import {
  Activity, CalendarCheck, CalendarDays, Heart, House, LayoutDashboard, ListOrdered, Medal, Megaphone, NotebookPen, Settings2, Shield, Sparkles, Trophy, Wrench, type LucideIcon,
} from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; match?: string[]; badge?: "notices" }

export const MEMBER_NAV: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/crowd", label: "Crowd meter", icon: Activity },
  { href: "/app/classes", label: "Classes", icon: CalendarDays, match: ["/app/classes", "/app/trainers"] },
  { href: "/app/buddy", label: "Gym Buddy", icon: Heart },
  { href: "/app/records", label: "Records", icon: Trophy },
  { href: "/app/leaderboard", label: "Leaderboard", icon: ListOrdered },
  { href: "/app/badges", label: "Badges", icon: Medal },
  { href: "/app/coach", label: "AI coach", icon: Sparkles },
  { href: "/app/log", label: "Workout log", icon: NotebookPen },
  { href: "/app/notices", label: "Notices", icon: Megaphone, badge: "notices" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/app/admin", label: "Overview", icon: Shield },
  { href: "/app/admin/bookings", label: "Bookings", icon: CalendarCheck, match: ["/app/admin/bookings", "/app/admin/trainer-requests"] },
  { href: "/app/admin/classes", label: "Manage", icon: Wrench, match: ["/app/admin/classes", "/app/admin/trainers", "/app/admin/members"] },
  { href: "/app/admin/settings", label: "Gym settings", icon: Settings2 },
  { href: "/app/admin/notices", label: "Notices", icon: Megaphone },
];

export const PROGRESS_ROUTES = ["/app/records", "/app/leaderboard", "/app/badges", "/app/coach", "/app/log"];

export const MEMBER_TABS: NavItem[] = [
  { href: "/app", label: "Home", icon: House, match: ["/app", "/app/crowd", "/app/profile"] },
  { href: "/app/classes", label: "Classes", icon: CalendarDays, match: ["/app/classes", "/app/trainers"] },
  { href: "/app/buddy", label: "Buddy", icon: Heart },
  { href: "/app/records", label: "Progress", icon: Trophy, match: PROGRESS_ROUTES },
  { href: "/app/notices", label: "Notices", icon: Megaphone, badge: "notices" },
];

export const ADMIN_TABS: NavItem[] = [
  { href: "/app/admin", label: "Overview", icon: Shield },
  { href: "/app/admin/bookings", label: "Bookings", icon: CalendarCheck, match: ["/app/admin/bookings", "/app/admin/trainer-requests"] },
  { href: "/app/admin/classes", label: "Manage", icon: Wrench, match: ["/app/admin/classes", "/app/admin/trainers", "/app/admin/members", "/app/admin/settings"] },
  { href: "/app/admin/notices", label: "Notices", icon: Megaphone },
];

export function isActive(item: NavItem, pathname: string) {
  const targets = item.match ?? [item.href];
  return targets.some((t) => (t === "/app" || t === "/app/admin" ? pathname === t : pathname === t || pathname.startsWith(t + "/")));
}

const TITLES: [string, string][] = [
  ["/app/admin/bookings", "Bookings"], ["/app/admin/trainer-requests", "Bookings"], ["/app/admin/classes", "Manage"], ["/app/admin/trainers", "Manage"],
  ["/app/admin/members", "Manage"], ["/app/admin/settings", "Gym settings"], ["/app/admin/notices", "Notices"], ["/app/admin", "Admin"],
  ["/app/crowd", "Crowd meter"], ["/app/classes", "Classes"], ["/app/trainers", "Classes"], ["/app/buddy", "Gym Buddy"], ["/app/notices", "Notices"],
  ["/app/profile", "Profile"], ...PROGRESS_ROUTES.map((r) => [r, "Progress"] as [string, string]),
];

export function titleFor(pathname: string) {
  return TITLES.find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1] ?? "Home";
}
