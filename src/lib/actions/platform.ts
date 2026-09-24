"use client";
// Platform (super admin) actions. Every one of these is also enforced by firestore.rules
// (isSuper()), so the UI gate is a convenience, not the security boundary.
import { createUserWithEmailAndPassword, sendEmailVerification, type User } from "firebase/auth";
import { collection, doc, getCountFromServer, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "../firebase";
import { P } from "../paths";
import { gymDefaults } from "../gym-defaults";
import { DEFAULT_BRAND } from "../branding";
import { rootDomain } from "../env";
import { GYM_COOKIE } from "../tenant";
import type { GymStatus, UserProfile } from "../types";

export async function createGym(input: { id: string; name: string; brandPrimary?: string; timezone: string; contactEmail: string }) {
  const ref = doc(getDb(), P.gym(input.id));
  if ((await getDoc(ref)).exists()) throw new Error("A gym with that address already exists — pick another.");
  const { id, ...defaults } = gymDefaults(input.id, input.name.trim());
  void id;
  await setDoc(ref, {
    ...defaults, name: input.name.trim(), brandPrimary: input.brandPrimary || DEFAULT_BRAND, timezone: input.timezone,
    contactEmail: input.contactEmail.trim().toLowerCase(), ownerUid: "", status: "active", createdAt: serverTimestamp(),
  });
}

export async function setGymStatus(gymId: string, status: GymStatus) {
  await updateDoc(doc(getDb(), P.gym(gymId)), { status });
}

export async function memberCount(gymId: string) {
  const snap = await getCountFromServer(collection(getDb(), P.memberProfiles(gymId)));
  return snap.data().count;
}

/**
 * Points the super admin's own users/{uid} doc at `gymId` with role admin, so every
 * normal admin screen works for that gym, then reloads onto that tenant.
 */
export async function enterGymAsAdmin(user: User, profile: UserProfile | null, gymId: string) {
  const ref = doc(getDb(), P.user(user.uid));
  if (profile) {
    await updateDoc(ref, { gymId, role: "admin" });
  } else {
    await setDoc(ref, {
      uid: user.uid, email: (user.email ?? "").toLowerCase(), gymId, role: "admin", firstName: "Gymli", lastName: "Platform", username: "gymli",
      fitnessGoals: [], bio: "", usualTrainingTime: "Varies", leaderboardOptIn: false, buddyOptIn: false, autoPresenceEnabled: false,
      photoURL: "", termsAcceptedAt: serverTimestamp(), createdAt: serverTimestamp(),
    });
  }
  if (rootDomain) {
    window.location.href = `${window.location.protocol}//${gymId}.${rootDomain}/app/admin`;
  } else {
    document.cookie = `${GYM_COOKIE}=${gymId}; path=/; max-age=31536000; samesite=lax`;
    window.location.assign("/app/admin");
  }
}

/** First-time platform account (no gym needed). Sends the verification email. */
export async function createPlatformAccount(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  await sendEmailVerification(cred.user, { url: `${window.location.origin}/super` });
  return cred.user;
}

export async function resendVerification(user: User) {
  await sendEmailVerification(user, { url: `${window.location.origin}/super` });
}
