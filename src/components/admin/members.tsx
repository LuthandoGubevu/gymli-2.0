"use client";
import { useEffect, useState } from "react";
import { Search, Shield, User, Users } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { useGym } from "@/components/providers/gym";
import { Button } from "@/components/ui/button";
import { Avatar, EmptyState, PageHeader, Pill, Skeleton } from "@/components/ui/bits";
import { Input } from "@/components/ui/input";
import { SubTabs } from "@/components/member/progress-tabs";
import { useMemberProfiles } from "@/hooks/use-data";
import { setMemberRole } from "@/lib/actions/admin";
import { fmtMonthYear } from "@/lib/dates";
import { toast, toastError } from "@/lib/toast";
import { errorMessage, fullName, initials } from "@/lib/utils";
import { MANAGE_TABS } from "./tabs";

export function MembersAdmin() {
  const { gymId, me } = useMe();
  const { gym } = useGym();
  const members = useMemberProfiles(gymId);
  const [q, setQ] = useState("");
  const rows = members.data
    .filter((m) => !q || `${m.firstName} ${m.lastName} ${m.username}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  const [joinLink, setJoinLink] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- window is client-only; read after mount
  useEffect(() => setJoinLink(`${window.location.origin}/signup`), []);
  return (
    <div className="flex flex-col gap-6">
      <SubTabs tabs={MANAGE_TABS} label="Manage" />
      <PageHeader eyebrow={`Admin · ${members.data.length} members`} title="Members" sub={<>New members join at <span className="font-mono text-foreground">{joinLink || "/signup"}</span></>} />
      <label className="relative max-w-sm">
        <span className="sr-only">Search members</span>
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or username" className="pl-10" />
      </label>
      {members.loading ? <Skeleton className="h-64 rounded-xl" /> : rows.length ? (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Members of {gym.name}</caption>
            <thead><tr className="border-b border-border font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">
              <th scope="col" className="px-6 py-3 text-left font-medium">Member</th><th scope="col" className="py-3 text-left font-medium">Joined</th><th scope="col" className="py-3 text-left font-medium">Opt-ins</th><th scope="col" className="px-6 py-3 text-right font-medium">Role</th>
            </tr></thead>
            <tbody>
              {rows.map((m) => {
                const owner = m.uid === gym.ownerUid;
                return (
                  <tr key={m.uid} className="border-b border-border last:border-0">
                    <td className="px-6 py-3"><span className="flex items-center gap-3"><Avatar initials={initials(m.firstName, m.lastName)} size={34} /><span className="flex flex-col"><span className="font-semibold">{fullName(m)}</span><span className="font-mono text-xs text-muted-foreground">@{m.username}</span></span></span></td>
                    <td className="py-3 font-mono text-[13px] text-muted-foreground">{m.createdAt ? fmtMonthYear(m.createdAt.toDate()) : "–"}</td>
                    <td className="py-3 text-[13px] text-muted-foreground">{[m.leaderboardOptIn && "Leaderboard", m.buddyOptIn && "Gym Buddy"].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-6 py-3 text-right">
                      {owner ? <Pill className="border-primary/40 bg-primary-soft px-2 py-0.5 text-xs text-accent-ink">Owner</Pill> : m.uid === me.uid ? <Pill className="border-border px-2 py-0.5 text-xs text-muted-foreground">You · admin</Pill> : (
                        <Button variant="outline" size="sm" onClick={async () => {
                          const next = m.role === "admin" ? "user" : "admin";
                          if (!window.confirm(next === "admin" ? `Make ${m.firstName} an admin? They'll be able to manage classes, bookings, notices and settings.` : `Remove admin access from ${m.firstName}?`)) return;
                          try { await setMemberRole(gymId, m.uid, next); toast(next === "admin" ? `${m.firstName} is now an admin` : `${m.firstName} is a member again`, "check", "success"); } catch (e) { toastError(errorMessage(e)); }
                        }}>{m.role === "admin" ? <><Shield size={14} aria-hidden />Admin</> : <><User size={14} aria-hidden />Member</>}</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <EmptyState icon={<Users size={26} />} title={q ? "No matches" : "No members yet"} sub={q ? "Try a different name." : "Share your signup link to get members in."} />}
    </div>
  );
}
