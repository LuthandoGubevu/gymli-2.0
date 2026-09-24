"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Shield, Sun, User } from "lucide-react";
import { useAuth, useMe } from "@/components/providers/auth";
import { useGym } from "@/components/providers/gym";
import { Logo } from "@/components/icons";
import { Avatar } from "@/components/ui/bits";
import { Toaster } from "@/components/providers/toaster";
import { useTheme } from "@/lib/theme";
import { useLocalPref } from "@/lib/local-pref";
import { useNoticeState } from "@/hooks/use-unread";
import { cn, fullName, initials } from "@/lib/utils";
import { ADMIN_NAV, ADMIN_TABS, MEMBER_NAV, MEMBER_TABS, isActive, titleFor, type NavItem } from "./nav";
import { NotificationBell } from "./notification-bell";
import { AutoPresence } from "./auto-presence";

function IconButton({ label, onClick, children, className }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={cn("grid h-10 w-10 place-items-center rounded-md border border-border text-muted-foreground transition-colors duration-150 hover:text-foreground", className)}>
      {children}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, isSuper } = useAuth();
  const { me, isAdmin } = useMe();
  const { gym } = useGym();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useLocalPref("gymli-sidebar-collapsed", false);
  const { unread } = useNoticeState(me);

  const adminView = isAdmin && pathname.startsWith("/app/admin");
  const nav = adminView ? ADMIN_NAV : MEMBER_NAV;
  const tabs = adminView ? ADMIN_TABS : MEMBER_TABS;
  const badgeFor = (i: NavItem) => (i.badge === "notices" && !adminView && unread > 0 ? unread : 0);
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  const roleLabel = adminView ? "Switch to member view" : "Switch to admin view";
  const switchRole = () => router.push(adminView ? "/app" : "/app/admin");
  const doSignOut = async () => { await signOut(); router.replace("/login"); };
  const name = fullName(me);
  const ini = initials(me.firstName, me.lastName);

  return (
    <div className="min-h-dvh nav:flex">
      <AutoPresence me={me} />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">Skip to content</a>

      {/* ---------- desktop sidebar ---------- */}
      <aside
        className={cn("sticky top-0 hidden h-dvh flex-none flex-col gap-1 overflow-hidden border-r border-border bg-card px-3 pb-4 pt-5 transition-[width] duration-200 ease-out nav:flex", collapsed ? "w-[76px]" : "w-[252px]")}
        aria-label="Main navigation"
      >
        <div className={cn("flex h-[52px] items-center gap-2 px-2.5 pb-[22px] pt-1", collapsed && "flex-col")}>
          <Link href={adminView ? "/app/admin" : "/app"} className="min-w-0 flex-1 text-foreground no-underline hover:no-underline" aria-label={`${gym.name} home`}>
            <Logo name={gym.name} showName={!collapsed} logoUrl={gym.logoUrl} />
          </Link>
          {!collapsed ? <NotificationBell uid={me.uid} /> : null}
        </div>
        {!collapsed ? <span className="whitespace-nowrap px-3.5 pb-2 font-mono text-[11px] font-medium uppercase tracking-[.1em] text-muted-foreground">{adminView ? "Admin" : "Member"}</span> : null}
        <nav className="no-scrollbar flex flex-col gap-1 overflow-y-auto">
          {nav.map((i) => {
            const active = isActive(i, pathname);
            const b = badgeFor(i);
            return (
              <Link key={i.href} href={i.href} title={collapsed ? i.label : undefined} aria-current={active ? "page" : undefined}
                className={cn("flex h-11 flex-none items-center gap-3 whitespace-nowrap rounded-md px-[15px] text-[15px] no-underline transition-[background-color,color,filter] duration-150 hover:no-underline hover:brightness-125",
                  active ? "bg-primary-soft font-semibold text-accent-ink" : "font-medium text-muted-foreground")}>
                <i.icon size={20} aria-hidden className="flex-none" />
                {!collapsed ? <span className="flex-1">{i.label}</span> : <span className="sr-only">{i.label}</span>}
                {!collapsed && b ? <span className="h-[22px] min-w-[22px] rounded-full bg-elevated px-1.5 text-center font-mono text-xs font-semibold leading-[22px] text-foreground" aria-label={`${b} unread`}>{b}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2.5 border-t border-border pt-4">
          {!collapsed ? (
            <Link href="/app/profile" className="flex items-center gap-2.5 rounded-md px-1.5 py-1 text-foreground no-underline hover:bg-elevated hover:no-underline">
              <Avatar initials={ini} photoURL={me.photoURL} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold">{name}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">{me.email}</span>
              </span>
            </Link>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {collapsed ? <NotificationBell uid={me.uid} className="border border-border" /> : null}
            {collapsed ? <IconButton label="Profile" onClick={() => router.push("/app/profile")}><User size={18} /></IconButton> : null}
            <IconButton label={themeLabel} onClick={toggle}><ThemeIcon size={18} /></IconButton>
            {isAdmin ? <IconButton label={roleLabel} onClick={switchRole}>{adminView ? <User size={18} /> : <Shield size={18} />}</IconButton> : null}
            {isSuper ? <IconButton label="Platform console (all gyms)" onClick={() => router.push("/super")}><Building2 size={18} /></IconButton> : null}
            <IconButton label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </IconButton>
            <IconButton label="Sign out" onClick={doSignOut}><LogOut size={18} /></IconButton>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ---------- mobile top bar ---------- */}
        <header className="sticky top-0 z-40 flex h-[60px] flex-none items-center justify-between gap-2 border-b border-border bg-glass pl-4 pr-2 backdrop-blur-[14px] nav:hidden">
          <Link href={adminView ? "/app/admin" : "/app"} className="flex min-w-0 items-center gap-2.5 text-foreground no-underline hover:no-underline" aria-label={`${gym.name} home`}>
            <Logo size={28} showName={false} name={gym.name} logoUrl={gym.logoUrl} />
            <span className="truncate font-display text-[17px] font-semibold leading-none">{titleFor(pathname)}</span>
          </Link>
          <div className="flex items-center">
            <NotificationBell uid={me.uid} className="h-11 w-11" />
            <button type="button" onClick={toggle} aria-label={themeLabel} className="grid h-11 w-11 place-items-center text-muted-foreground"><ThemeIcon size={20} /></button>
            {isAdmin ? <button type="button" onClick={switchRole} aria-label={roleLabel} className="grid h-11 w-11 place-items-center text-muted-foreground">{adminView ? <User size={20} /> : <Shield size={20} />}</button> : null}
            {isSuper ? <Link href="/super" aria-label="Platform console (all gyms)" className="grid h-11 w-11 place-items-center text-muted-foreground"><Building2 size={20} /></Link> : null}
            <Link href="/app/profile" aria-label="Profile" className="grid h-11 w-11 place-items-center"><Avatar initials={ini} size={30} photoURL={me.photoURL} /></Link>
          </div>
        </header>

        <main id="main" className="flex-1 pb-[96px] nav:pb-0">
          <div key={pathname} className="mx-auto max-w-[1180px] animate-gy-up px-4 pb-8 pt-5 nav:px-10 nav:pb-14 nav:pt-9">
            {children}
          </div>
        </main>

        {/* ---------- mobile bottom tabs ---------- */}
        <nav aria-label="Main navigation" className="pb-safe fixed inset-x-0 bottom-0 z-40 flex h-[74px] border-t border-border bg-glass px-1.5 pt-1.5 backdrop-blur-[16px] nav:hidden" style={{ height: "calc(74px + max(0px, env(safe-area-inset-bottom) - 12px))" }}>
          {tabs.map((t) => {
            const active = isActive(t, pathname);
            const b = badgeFor(t);
            return (
              <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
                className={cn("flex flex-1 flex-col items-center justify-center gap-1 no-underline transition-colors hover:no-underline", active ? "text-accent-ink" : "text-muted-foreground")}>
                <span className={cn("relative grid h-[30px] w-[52px] place-items-center rounded-full transition-colors [transition-duration:180ms]", active && "bg-primary-soft")}>
                  <t.icon size={21} aria-hidden />
                  {b ? <span className="absolute -right-0.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold text-primary-foreground" aria-label={`${b} unread`}>{b}</span> : null}
                </span>
                <span className={cn("text-[11px]", active ? "font-semibold" : "font-medium")}>{t.label}</span>
              </Link>
            );
          })}
        </nav>
        <Toaster raised />
      </div>
    </div>
  );
}
