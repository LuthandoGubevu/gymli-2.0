"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where } from "firebase/firestore";
import { Clock, Heart, MessageCircle, Search, Trophy, X } from "lucide-react";
import { useMe } from "@/components/providers/auth";
import { useGym } from "@/components/providers/gym";
import { useCelebrate } from "@/components/providers/celebration";
import { Button } from "@/components/ui/button";
import { Avatar, EmptyState, PageHeader, Skeleton, StatTile } from "@/components/ui/bits";
import { Segmented } from "@/components/ui/segmented";
import { ToggleRow } from "@/components/ui/switch";
import { useBadges, useGamification, useMatches, usePRs } from "@/hooks/use-data";
import { useQuery } from "@/hooks/use-firestore";
import { useToday } from "@/hooks/use-today";
import { swipe } from "@/lib/actions/buddy";
import { updateProfile } from "@/lib/actions/profile";
import { relativeTime } from "@/lib/dates";
import { P } from "@/lib/paths";
import { displayGamification } from "@/lib/streaks";
import { toast, toastError } from "@/lib/toast";
import type { BuddySwipe, MemberProfile } from "@/lib/types";
import { errorMessage, initials } from "@/lib/utils";

export function BuddyPage() {
  const { me } = useMe();
  const [tab, setTab] = useState<"discover" | "matches">("discover");
  const matches = useMatches(me.gymId, me.uid);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Gym Buddy" title="Find someone to train with" actions={me.buddyOptIn ? (
        <Segmented ariaLabel="Gym Buddy view" value={tab} onChange={setTab} options={[{ value: "discover", label: "Discover" }, { value: "matches", label: `Matches · ${matches.data.length}` }]} />
      ) : undefined} />
      {!me.buddyOptIn ? <OptIn /> : tab === "discover" ? <Discover onShowMatches={() => setTab("matches")} /> : <Matches onBrowse={() => setTab("discover")} />}
    </div>
  );
}

function OptIn() {
  const { me } = useMe();
  const { gym } = useGym();
  const gam = useGamification(me.gymId, me.uid);
  const [saving, setSaving] = useState(false);
  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col gap-4">
      <EmptyState icon={<Heart size={26} />} title="Gym Buddy is off" sub="Turn it on to browse members who want a training partner. Only members who opt in can see you — and your streak, visits, PRs and badges." />
      <ToggleRow id="buddy-optin" icon={<Heart size={22} />} title="Gym Buddy matching" description="You can switch it off any time" checked={false} disabled={saving}
        onCheckedChange={async () => {
          setSaving(true);
          try { await updateProfile(me, { buddyOptIn: true }, { timezone: gym.timezone, gamification: gam.data }); toast("Gym Buddy on — happy hunting", "heart", "accent"); }
          catch (e) { toastError(errorMessage(e)); } finally { setSaving(false); }
        }} />
    </div>
  );
}

function Discover({ onShowMatches }: { onShowMatches: () => void }) {
  const { me } = useMe();
  const celebrate = useCelebrate();
  const router = useRouter();
  const g = me.gymId;
  const profiles = useQuery<MemberProfile>(`buddyProfiles:${g}`, (db) => query(collection(db, P.memberProfiles(g)), where("buddyOptIn", "==", true)));
  const mySwipes = useQuery<BuddySwipe>(`mySwipes:${g}:${me.uid}`, (db) => query(collection(db, P.swipes(g)), where("fromUserId", "==", me.uid)));
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const candidates = useMemo(() => {
    const seen = new Set(mySwipes.data.map((s) => s.toUserId));
    return profiles.data
      .filter((p) => p.uid !== me.uid && !seen.has(p.uid) && !skipped.has(p.uid))
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  }, [profiles.data, mySwipes.data, skipped, me.uid]);
  const total = candidates.length + skipped.size;
  const cand = candidates[0];

  if (profiles.loading || mySwipes.loading) return <Skeleton className="mx-auto h-[520px] w-full max-w-[460px] rounded-2xl" />;
  if (!cand) {
    return <EmptyState icon={<Search size={26} />} title="You've seen everyone for now" sub="New members opt in every week — we'll show them here first." action={<Button size="lg" onClick={onShowMatches}>View matches</Button>} />;
  }

  const act = async (action: "like" | "pass") => {
    if (busy) return;
    setBusy(true);
    setSkipped((s) => new Set(s).add(cand.uid));
    try {
      const r = await swipe(me, cand, action);
      if (r.matched) {
        celebrate({
          kind: "match", match: { a: initials(me.firstName, me.lastName), b: initials(cand.firstName, cand.lastName) }, eyebrow: "Gym Buddy", title: "It's a match!",
          sub: `You and ${cand.firstName} both liked each other. ${cand.firstName} usually trains ${cand.usualTrainingTime?.toLowerCase() ?? "at varied times"}.`,
          primary: `Say hi to ${cand.firstName}`, secondary: "Keep browsing", onPrimary: () => router.push(`/app/buddy/${r.matchId}`),
        });
      } else if (action === "like") {
        toast("Like sent — we'll tell you if it's mutual", "heart", "accent");
      }
    } catch (e) {
      setSkipped((s) => { const n = new Set(s); n.delete(cand.uid); return n; });
      toastError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex justify-center">
      <div className="flex w-full max-w-[460px] flex-col gap-5">
        <CandidateCard key={cand.uid} p={cand} pos={`${skipped.size + 1} of ${total}`} />
        <div className="flex items-center justify-center gap-5">
          <button type="button" onClick={() => act("pass")} disabled={busy} aria-label={`Pass on ${cand.firstName}`} title="Pass"
            className="grid h-[60px] w-[60px] place-items-center rounded-full border border-border bg-card text-muted-foreground transition-[transform,color] duration-150 hover:text-foreground active:scale-[.92] disabled:opacity-60"><X size={26} /></button>
          <button type="button" onClick={() => act("like")} disabled={busy} aria-label={`Like ${cand.firstName}`} title="Like"
            className="grid h-[72px] w-[72px] place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform duration-150 active:scale-[.92] disabled:opacity-60"><Heart size={30} strokeWidth={2.25} /></button>
        </div>
      </div>
    </div>
  );
}

/** Stats are readable only because both members have buddyOptIn (see firestore.rules). */
function CandidateCard({ p, pos }: { p: MemberProfile; pos: string }) {
  const { gymId: g } = useMe();
  const { key: today } = useToday();
  const gam = useGamification(g, p.uid);
  const prs = usePRs(g, p.uid);
  const badges = useBadges(g, p.uid);
  const stats = today ? displayGamification(gam.data, today) : null;
  const top = [...prs.data].sort((a, b) => b.value - a.value)[0];
  return (
    <article className="animate-gy-pop overflow-hidden rounded-2xl border border-border bg-card" aria-label={`${p.firstName} ${p.lastName}`}>
      <div className="relative grid h-[200px] place-items-center border-b border-border bg-elevated">
        {p.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photoURL} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : <span className="font-display text-[72px] font-bold leading-none tracking-[-0.04em] text-muted-foreground" aria-hidden>{initials(p.firstName, p.lastName)}</span>}
        <span className="absolute right-3.5 top-3.5 font-mono text-xs font-medium text-muted-foreground">{pos}</span>
      </div>
      <div className="flex flex-col gap-4 px-6 pb-6 pt-[22px]">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-[26px] font-bold leading-[1.1] tracking-[-0.02em]">{p.firstName} {p.lastName}</h2>
          <span className="text-[15px] font-medium text-accent-ink">{p.fitnessGoals?.join(" · ") || "Training"}</span>
        </div>
        {p.bio ? <p className="text-[15px] leading-[1.55] text-muted-foreground [text-wrap:pretty]">{p.bio}</p> : null}
        <div className="grid grid-cols-3 gap-2">
          <StatTile value={stats?.currentStreakDays ?? "–"} label="day streak" />
          <StatTile value={stats?.totalVisits ?? "–"} label="visits" />
          <StatTile value={badges.loading ? "–" : badges.data.length} label="badges" />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><Clock size={14} aria-hidden />{p.usualTrainingTime || "Varies"}</span>
          {top ? <span className="flex items-center gap-1.5"><Trophy size={14} aria-hidden />{top.exercise} {top.value} {top.unit}</span> : null}
        </div>
      </div>
    </article>
  );
}

function Matches({ onBrowse }: { onBrowse: () => void }) {
  const { me } = useMe();
  const matches = useMatches(me.gymId, me.uid);
  const rows = [...matches.data].sort((a, b) => ((b.lastMessageAt ?? b.createdAt)?.toMillis?.() ?? 0) - ((a.lastMessageAt ?? a.createdAt)?.toMillis?.() ?? 0));
  if (matches.loading) return <Skeleton className="h-40 rounded-xl" />;
  if (!rows.length) return <EmptyState icon={<Heart size={26} />} title="No matches yet" sub="Like a few profiles — when it's mutual, they'll show up here." action={<Button size="lg" onClick={onBrowse}>Start browsing</Button>} />;
  return (
    <ul className="surface flex flex-col overflow-hidden">
      {rows.map((m) => {
        const other = m.members.find((u) => u !== me.uid) ?? "";
        const name = m.memberNames?.[other] ?? "Your match";
        const [f, ...rest] = name.split(" ");
        const fresh = !m.lastMessageAt;
        const when = (m.lastMessageAt ?? m.createdAt)?.toDate?.();
        return (
          <li key={m.id} className="border-b border-border last:border-0">
            <Link href={`/app/buddy/${m.id}`} className="flex items-center gap-3.5 px-[22px] py-[18px] text-foreground no-underline transition-colors hover:bg-elevated hover:no-underline">
              <Avatar initials={initials(f, rest.pop())} size={48} ring={fresh} />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-base font-semibold">{name}</span>
                <span className="truncate text-sm text-muted-foreground">{fresh ? "Matched — say hi." : `${m.lastSenderId === me.uid ? "You: " : ""}${m.lastMessage}`}</span>
              </span>
              <span className="flex-none font-mono text-xs text-muted-foreground">{when ? relativeTime(when) : ""}</span>
              <MessageCircle size={20} className="flex-none text-muted-foreground" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
