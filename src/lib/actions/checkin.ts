"use client";
import { collection, doc, getDocs, increment, runTransaction, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { getDb } from "../firebase";
import { P } from "../paths";
import type { CheckInSource, Gamification, Gym, UserProfile } from "../types";
import { dateKey, zonedParts } from "../dates";
import { applyVisit } from "../streaks";
import { BADGES, badgeInputs, qualifiedBadgeIds } from "../badges";
import { initials } from "../utils";

export interface CheckInResult {
  firstToday: boolean;
  gamification: Gamification | null;
  newBadges: string[];
}

/**
 * Check in (manual or geofence). One transaction: presence → active, and — only for the
 * day's first check-in — the idempotent gymVisits/{uid}_{date} doc, a checkIns log entry,
 * the hourly rollup (+1) and the streak/visit counters. Then leaderboard + badges.
 */
export async function checkIn(gym: Gym, me: UserProfile, source: CheckInSource): Promise<CheckInResult> {
  const db = getDb();
  const now = new Date();
  const today = dateKey(now, gym.timezone);
  const parts = zonedParts(now, gym.timezone);
  const hourKey = String(parts.hour).padStart(2, "0");
  const g = me.gymId;

  const result = await runTransaction(db, async (tx) => {
    const visitRef = doc(db, P.visit(g, me.uid, today));
    const gamRef = doc(db, P.gamification(g, me.uid));
    const statRef = doc(db, P.checkInStat(g, today));
    const [visit, gam, stat] = await Promise.all([tx.get(visitRef), tx.get(gamRef), tx.get(statRef)]);

    tx.set(doc(db, P.presenceOf(g, me.uid)), { isActive: true, lastSeen: serverTimestamp(), lastCheckInAt: serverTimestamp(), source });
    if (visit.exists()) return { firstToday: false, gamification: (gam.data() as Gamification) ?? null };

    const next = applyVisit(gam.exists() ? (gam.data() as Gamification) : null, today)!;
    tx.set(visitRef, { uid: me.uid, dateKey: today, source, createdAt: serverTimestamp() });
    tx.set(doc(collection(db, P.checkIns(g))), { uid: me.uid, source, dateKey: today, dayOfWeek: parts.weekday, hourOfDay: parts.hour, createdAt: serverTimestamp() });
    tx.set(gamRef, { ...next, updatedAt: serverTimestamp() });
    if (stat.exists()) tx.update(statRef, { total: increment(1), [`hours.${hourKey}`]: increment(1) });
    else tx.set(statRef, { dateKey: today, dayOfWeek: parts.weekday, total: 1, hours: { [hourKey]: 1 } });
    return { firstToday: true, gamification: next };
  });

  let newBadges: string[] = [];
  if (result.firstToday && result.gamification) {
    const gm = result.gamification;
    if (me.leaderboardOptIn) {
      await setDoc(doc(db, P.leaderboardEntry(g, gm.monthKey, me.uid)), {
        uid: me.uid, displayName: `${me.firstName} ${me.lastName}`.trim(), initials: initials(me.firstName, me.lastName),
        visits: gm.visitsThisMonth, streak: gm.currentStreakDays, updatedAt: serverTimestamp(),
      }).catch((e) => console.warn("leaderboard sync failed", e));
    }
    const prs = await getDocs(collection(db, P.records(g, me.uid)));
    newBadges = await awardBadges(g, me.uid, badgeInputs(gm, prs.size));
  }
  return { ...result, newBadges };
}

export async function checkOut(gymId: string, uid: string) {
  await setDoc(doc(getDb(), P.presenceOf(gymId, uid)), { isActive: false, lastSeen: serverTimestamp() }, { merge: true });
}

/** Writes any newly-qualified badges; returns their IDs (for the celebration). */
export async function awardBadges(gymId: string, uid: string, inputs: ReturnType<typeof badgeInputs>): Promise<string[]> {
  const db = getDb();
  const earned = new Set((await getDocs(collection(db, P.badges(gymId, uid)))).docs.map((d) => d.id));
  const fresh = qualifiedBadgeIds(inputs).filter((id) => !earned.has(id));
  if (!fresh.length) return [];
  const b = writeBatch(db);
  fresh.forEach((id) => b.set(doc(db, P.badges(gymId, uid), id), { earnedAt: serverTimestamp() }));
  await b.commit();
  return fresh;
}

export const badgeById = (id: string) => BADGES.find((b) => b.id === id)!;
