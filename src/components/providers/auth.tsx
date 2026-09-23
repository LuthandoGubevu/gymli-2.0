"use client";
import * as React from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { firebaseConfigured } from "@/lib/env";
import type { UserProfile } from "@/lib/types";

export type AuthStatus = "loading" | "signedOut" | "noProfile" | "ready";

interface AuthCtx {
  status: AuthStatus;
  user: User | null;
  profile: UserProfile | null;
  signOut: () => Promise<void>;
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

  React.useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    if (!firebaseConfigured) return;
    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), (u) => {
        unsubProfile?.();
        setUser(u);
        setAuthHint(!!u);
        if (!u) { setProfile(null); setStatus("signedOut"); return; }
        setStatus("loading");
        unsubProfile = onSnapshot(
          doc(getDb(), "users", u.uid),
          (snap) => {
            if (snap.exists()) { setProfile({ ...(snap.data() as UserProfile), uid: u.uid }); setStatus("ready"); }
            else { setProfile(null); setStatus("noProfile"); }
          },
          () => { setProfile(null); setStatus("noProfile"); },
        );
      });
    return () => { unsubProfile?.(); unsubAuth(); };
  }, []);

  const signOut = React.useCallback(async () => {
    await fbSignOut(getFirebaseAuth());
  }, []);

  const value = React.useMemo(() => ({ status, user, profile, signOut }), [status, user, profile, signOut]);
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
