"use client";
import { createUserWithEmailAndPassword, deleteUser, sendEmailVerification, signInWithEmailAndPassword, type User } from "firebase/auth";
import { isSuperAdminEmail } from "../platform";
import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "../firebase";
import { P } from "../paths";
import type { TrainingTime } from "../types";

export interface SignupInput {
  gymId: string;
  email: string;
  password: string;
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

export const normalizeUsername = (u: string) => u.trim().toLowerCase();

export async function isUsernameFree(gymId: string, username: string) {
  const snap = await getDoc(doc(getDb(), P.username(gymId, normalizeUsername(username))));
  return !snap.exists();
}

export class UsernameTakenError extends Error {
  constructor() { super("That username is taken — try another."); }
}

function profileDocs(uid: string, i: SignupInput, role: "user" | "admin") {
  const username = normalizeUsername(i.username);
  const shared = {
    firstName: i.firstName.trim(), lastName: i.lastName.trim(), username, fitnessGoals: i.fitnessGoals, bio: i.bio.trim(),
    usualTrainingTime: i.usualTrainingTime, buddyOptIn: i.buddyOptIn, leaderboardOptIn: i.leaderboardOptIn, photoURL: "", role,
  };
  return {
    user: { ...shared, uid, gymId: i.gymId, email: i.email.trim().toLowerCase(), autoPresenceEnabled: i.autoPresenceEnabled, termsAcceptedAt: serverTimestamp(), createdAt: serverTimestamp() },
    member: { ...shared, uid, createdAt: serverTimestamp() },
    username,
  };
}

/**
 * Member signup: every profile field is collected up front and written atomically.
 * If `existing` is passed (signed in but no profile — e.g. an earlier signup was
 * interrupted), the auth account is reused instead of created.
 */
export async function signUpMember(i: SignupInput, existing?: User | null) {
  if (!(await isUsernameFree(i.gymId, i.username))) throw new UsernameTakenError();
  const user = existing ?? (await createUserWithEmailAndPassword(getFirebaseAuth(), i.email.trim(), i.password)).user;
  const d = profileDocs(user.uid, { ...i, email: user.email ?? i.email }, "user");
  const db = getDb();
  const b = writeBatch(db);
  b.set(doc(db, P.user(user.uid)), d.user);
  b.set(doc(db, P.memberProfile(i.gymId, user.uid)), d.member);
  b.set(doc(db, P.username(i.gymId, d.username)), { uid: user.uid });
  try {
    await b.commit();
  } catch (e) {
    if (!existing) await deleteUser(user).catch(() => {});
    throw e;
  }
  // Super-admin powers require a verified address; start that flow right away.
  if (isSuperAdminEmail(user.email) && !user.emailVerified) await sendEmailVerification(user).catch(() => {});
  return user;
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}
