"use client";
import { createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "../firebase";
import { P } from "../paths";
import type { Gym, TrainingTime } from "../types";
import { DEFAULT_BRAND } from "../branding";
import { gymDefaults } from "../gym-defaults";

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
  return user;
}

/** New-gym onboarding: creates the gym and its owner (as admin) in one batch. */
export async function signUpGymOwner(i: SignupInput & { gymName: string; brandPrimary?: string; timezone: string }) {
  const gymRef = doc(getDb(), P.gym(i.gymId));
  if ((await getDoc(gymRef)).exists()) throw new Error("That gym address is taken — pick another.");
  const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), i.email.trim(), i.password);
  const d = profileDocs(cred.user.uid, i, "admin");
  const db = getDb();
  const base = gymDefaults(i.gymId, i.gymName.trim());
  const gym: Omit<Gym, "id" | "createdAt"> & { createdAt: unknown } = {
    ...base, name: i.gymName.trim(), ownerUid: cred.user.uid, brandPrimary: i.brandPrimary || DEFAULT_BRAND, timezone: i.timezone,
    contactEmail: i.email.trim().toLowerCase(), createdAt: serverTimestamp(),
  };
  delete (gym as { id?: string }).id;
  const b = writeBatch(db);
  b.set(gymRef, gym);
  b.set(doc(db, P.user(cred.user.uid)), d.user);
  b.set(doc(db, P.memberProfile(i.gymId, cred.user.uid)), d.member);
  b.set(doc(db, P.username(i.gymId, d.username)), { uid: cred.user.uid });
  try {
    await b.commit();
  } catch (e) {
    await deleteUser(cred.user).catch(() => {});
    throw e;
  }
  return cred.user;
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}
