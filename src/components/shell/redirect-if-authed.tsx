"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth";
import { isSuperAdminEmail } from "@/lib/platform";

/**
 * Moves a signed-in user off the auth pages. Members with a profile go into the app.
 * Accounts without one (e.g. the platform account created on /super) must still go
 * somewhere, or sign-in looks like it silently did nothing: platform admins → /super,
 * everyone else → /app, where the gate offers to finish signup. Only enabled on /login:
 * during signup there's a moment between creating the account and writing its profile.
 */
export function RedirectIfAuthed({ profileless = false }: { profileless?: boolean }) {
  const { status, user, isSuper } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    if (status === "ready") {
      const next = params.get("next");
      router.replace(next && next.startsWith("/app") ? next : "/app");
    } else if (status === "noProfile" && profileless) {
      router.replace(isSuper || isSuperAdminEmail(user?.email) ? "/super" : "/app");
    }
  }, [status, user, isSuper, profileless, router, params]);
  return null;
}
