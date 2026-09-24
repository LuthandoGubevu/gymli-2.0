"use client";
import * as React from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { firebaseConfigured } from "@/lib/env";
import { isSuperAdmin } from "@/lib/platform";
import type { UserProfile } from "@/lib/types";

export type AuthStatus = "loading" | "signedOut" | "noProfile" | "ready";

interface AuthCtx {
  status: AuthStatus;
  user: User | null;
  profile: UserProfile | null;
  /** Platform super admin: a platformAdmins/{uid} doc, or the verified listed email (see firestore.rules). */
  isSuper: boolean;
  signOut: () => Promise<void>;
  /** Re-reads the Firebase user and forces a fresh ID token (e.g. after verifying email). */
  refreshUser: () => Promise<void>;
}

const Ctx = React.createContext<AuthCtx | null>(null);
import { AUTH_HINT_COOKIE } from "@/lib/tenant";

// A UX-only hint so the marketing page can redirect signed-in members server-side
// without a flash. It grants nothing — every read/write is still checked by rules.
function setAuthHint(on: boolean) {
  document.cookie = on ? `${AUTH_HINT_COOKIE}=1; path=/; max-age=2592000; samesite=lax` : `${AUTH_HINT_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>(firebaseConfigured ? "loading" : "signedOut");
  // uid whose platformAdmins doc exists (keyed so a stale value never leaks across accounts)
  const [platformUid, setPlatformUid] = React.useState<string | null>(null);

  React.useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    let unsubPlatform: (() => void) | undefined;
    if (!firebaseConfigured) return;
    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), (u) => {
        unsubProfile?.();
        unsubPlatform?.();
        unsubPlatform = undefined;
        setUser(u);
        setAuthHint(!!u);
        if (!u) { setProfile(null); setStatus("signedOut"); return; }
        setStatus("loading");
        // Granted by hand in the Firebase console; live, so /super unlocks without a reload.
        unsubPlatform = onSnapshot(
          doc(getDb(), "platformAdmins", u.uid),
          (snap) => setPlatformUid(snap.exists() ? u.uid : null),
          () => setPlatformUid(null),
        );
        unsubProfile = onSnapshot(
          doc(getDb(), "users", u.uid),
          (snap) => {
            if (snap.exists()) { setProfile({ ...(snap.data() as UserProfile), uid: u.uid }); setStatus("ready"); }
            else { setProfile(null); setStatus("noProfile"); }
          },
          () => { setProfile(null); setStatus("noProfile"); },
        );
      });
    return () => { unsubProfile?.(); unsubPlatform?.(); unsubAuth(); };
  }, []);

  const [, bump] = React.useReducer((n: number) => n + 1, 0);

  const signOut = React.useCallback(async () => {
    await fbSignOut(getFirebaseAuth());
  }, []);

  const refreshUser = React.useCallback(async () => {
    const u = getFirebaseAuth().currentUser;
    if (!u) return;
    await u.reload();
    await u.getIdToken(true); // new token carries email_verified, which the rules check
    bump();
  }, []);

  const isSuper = (!!user && platformUid === user.uid) || isSuperAdmin(user);
  const value = React.useMemo(() => ({ status, user, profile, isSuper, signOut, refreshUser }), [status, user, profile, isSuper, signOut, refreshUser]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

/** For pages inside the authenticated shell, where profile is guaranteed. */
export function useMe() {
  const { profile, user } = useAuth();
  if (!profile || !user) throw new Error("useMe used outside a ready session");
  return { me: profile, user, gymId: profile.gymId, isAdmin: profile.role === "admin" };
}
