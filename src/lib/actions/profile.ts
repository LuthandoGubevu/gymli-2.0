"use client";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { getDb } from "../firebase";
import { P } from "../paths";
import type { Gamification, TrainingTime, UserProfile } from "../types";
import { normalizeUsername, UsernameTakenError, isUsernameFree } from "./auth";
import { monthKey } from "../dates";
import { initials } from "../utils";

export interface ProfilePatch {
  firstName: string;
  lastName: string;
  username: string;
  fitnessGoals: string[];
  bio: string;
  usualTrainingTime: TrainingTime;
  leaderboardOptIn: boolean;
  buddyOptIn: boolean;
  autoPresenceEnabled: boolean;
}

/** Saves users/{uid} and mirrors the shareable fields into memberProfiles in one batch,
 *  keeping the username claim and the leaderboard entry consistent with the opt-ins. */
export async function updateProfile(me: UserProfile, patch: Partial<ProfilePatch>, ctx: { timezone: string; gamification?: Gamification | null }) {
  const db = getDb();
  const next = { ...me, ...patch };
  const newUsername = patch.username !== undefined ? normalizeUsername(patch.username) : me.username;
  if (newUsername !== me.username && !(await isUsernameFree(me.gymId, newUsername))) throw new UsernameTakenError();

  const b = writeBatch(db);
  const userPatch: Record<string, unknown> = { ...patch };
  if (patch.username !== undefined) userPatch.username = newUsername;
  b.update(doc(db, P.user(me.uid)), userPatch);
  b.set(doc(db, P.memberProfile(me.gymId, me.uid)), {
    uid: me.uid, role: me.role, firstName: next.firstName, lastName: next.lastName, username: newUsername, fitnessGoals: next.fitnessGoals,
    bio: next.bio, usualTrainingTime: next.usualTrainingTime, buddyOptIn: next.buddyOptIn, leaderboardOptIn: next.leaderboardOptIn, photoURL: next.photoURL ?? "",
  }, { merge: true });
  if (newUsername !== me.username) {
    b.set(doc(db, P.username(me.gymId, newUsername)), { uid: me.uid });
    b.delete(doc(db, P.username(me.gymId, me.username)));
  }
  const mk = monthKey(new Date(), ctx.timezone);
  const entryRef = doc(db, P.leaderboardEntry(me.gymId, mk, me.uid));
  if (patch.leaderboardOptIn === false) b.delete(entryRef);
  if (next.leaderboardOptIn && (patch.leaderboardOptIn === true || patch.firstName !== undefined || patch.lastName !== undefined)) {
    const g = ctx.gamification;
    const visits = g && g.monthKey === mk ? g.visitsThisMonth : 0;
    b.set(entryRef, { uid: me.uid, displayName: `${next.firstName} ${next.lastName}`.trim(), initials: initials(next.firstName, next.lastName), visits, streak: g?.currentStreakDays ?? 0, updatedAt: serverTimestamp() });
  }
  await b.commit();
}
