"use client";
import { collection, limit, orderBy, query, where } from "firebase/firestore";
import { useMemo } from "react";
import { useDoc, useQuery } from "./use-firestore";
import { useNow } from "./use-now";
import { P } from "@/lib/paths";
import type {
  AppNotification, BuddyMatch, ClassBooking, ClassSlot, CheckInStats, EarnedBadge, Gamification, GymClass, LeaderboardEntry,
  Notice, PersonalRecord, Trainer, TrainerBooking, UserPresence, WorkoutPlan, WorkoutLog, BodyMetric, MemberProfile, GymVisit,
} from "@/lib/types";
import { crowdInfo, type DEFAULT_THRESHOLDS } from "@/lib/crowd";

const PRESENCE_TTL_MS = 4 * 60 * 60 * 1000; // presence auto-expires after 4h without a check-out

export const useGamification = (g: string, u: string) => useDoc<Gamification>(P.gamification(g, u));

export function usePRs(g: string, u: string) {
  return useQuery<PersonalRecord>(`prs:${g}:${u}`, (db) => query(collection(db, P.records(g, u))));
}

export function useBadges(g: string, u: string) {
  return useQuery<EarnedBadge>(`badges:${g}:${u}`, (db) => query(collection(db, P.badges(g, u))));
}

/** Live occupancy: presence docs marked active and seen within the TTL. */
export function useOccupancy(g: string, t: typeof DEFAULT_THRESHOLDS) {
  const q = useQuery<UserPresence>(`presence:${g}`, (db) => query(collection(db, P.presence(g)), where("isActive", "==", true)));
  const now = useNow();
  return useMemo(() => {
    const cutoff = now ? now.getTime() - PRESENCE_TTL_MS : -Infinity;
    // A pending server timestamp (our own just-written check-in) has no millis yet: count it.
    const count = q.data.filter((p) => (p.lastCheckInAt?.toMillis?.() ?? p.lastSeen?.toMillis?.() ?? Infinity) > cutoff).length;
    return { ...crowdInfo(count, t), loading: q.loading, presence: q.data };
  }, [q.data, q.loading, t, now]);
}

export const useMyPresence = (g: string, u: string) => useDoc<UserPresence>(P.presenceOf(g, u));

export function useClasses(g: string) {
  return useQuery<GymClass>(`classes:${g}`, (db) => query(collection(db, P.classes(g))));
}

export function useTrainers(g: string) {
  return useQuery<Trainer>(`trainers:${g}`, (db) => query(collection(db, P.trainers(g))));
}

export function useSlots(g: string, from: string | null, to: string | null) {
  return useQuery<ClassSlot>(from && to ? `slots:${g}:${from}:${to}` : null, (db) => query(collection(db, P.classSlots(g)), where("date", ">=", from!), where("date", "<=", to!)));
}

export function useMyBookings(g: string, u: string, from: string | null) {
  return useQuery<ClassBooking>(from ? `mybookings:${g}:${u}:${from}` : null, (db) => query(collection(db, P.classBookings(g)), where("userId", "==", u), where("date", ">=", from!)));
}

export function useAllBookings(g: string, from: string | null) {
  return useQuery<ClassBooking>(from ? `allbookings:${g}:${from}` : null, (db) => query(collection(db, P.classBookings(g)), where("date", ">=", from!)));
}

export function useMyTrainerBookings(g: string, u: string) {
  return useQuery<TrainerBooking>(`mytrainer:${g}:${u}`, (db) => query(collection(db, P.trainerBookings(g)), where("userId", "==", u)));
}

export function useAllTrainerBookings(g: string) {
  return useQuery<TrainerBooking>(`alltrainer:${g}`, (db) => query(collection(db, P.trainerBookings(g)), orderBy("createdAt", "desc"), limit(200)));
}

export function useNotices(g: string, max = 100) {
  return useQuery<Notice>(`notices:${g}:${max}`, (db) => query(collection(db, P.notices(g)), orderBy("createdAt", "desc"), limit(max)));
}

export function useNoticeReads(u: string) {
  return useQuery<{ readAt: unknown }>(`noticeReads:${u}`, (db) => query(collection(db, P.noticeReads(u))));
}

export function useNotifications(u: string) {
  return useQuery<AppNotification>(`notifications:${u}`, (db) => query(collection(db, P.notifications(u)), orderBy("createdAt", "desc"), limit(30)));
}

export function useLeaderboard(g: string, month: string) {
  return useQuery<LeaderboardEntry>(`lb:${g}:${month}`, (db) => query(collection(db, P.leaderboard(g, month)), orderBy("visits", "desc"), limit(100)));
}

export function useCheckInStats(g: string, from: string | null) {
  return useQuery<CheckInStats>(from ? `stats:${g}:${from}` : null, (db) => query(collection(db, P.checkInStats(g)), where("dateKey", ">=", from!)));
}

export function usePlans(g: string, u: string) {
  return useQuery<WorkoutPlan>(`plans:${g}:${u}`, (db) => query(collection(db, P.plans(g, u)), orderBy("createdAt", "desc"), limit(5)));
}

export function useWorkoutLogs(g: string, u: string) {
  return useQuery<WorkoutLog>(`logs:${g}:${u}`, (db) => query(collection(db, P.workoutLogs(g, u)), orderBy("date", "desc"), limit(100)));
}

export function useBodyMetrics(g: string, u: string) {
  return useQuery<BodyMetric>(`metrics:${g}:${u}`, (db) => query(collection(db, P.bodyMetrics(g, u)), orderBy("date", "desc"), limit(100)));
}

export function useMatches(g: string, u: string) {
  return useQuery<BuddyMatch>(`matches:${g}:${u}`, (db) => query(collection(db, P.matches(g)), where("members", "array-contains", u)));
}

export function useMemberProfiles(g: string, enabled = true) {
  return useQuery<MemberProfile>(enabled ? `profiles:${g}` : null, (db) => query(collection(db, P.memberProfiles(g))));
}

export function useRecentVisits(g: string, u: string, from: string | null) {
  return useQuery<GymVisit>(from ? `visits:${g}:${u}:${from}` : null, (db) => query(collection(db, `gyms/${g}/gymVisits`), where("uid", "==", u), where("dateKey", ">=", from!)));
}
