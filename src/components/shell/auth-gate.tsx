"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth";
import { useGym } from "@/components/providers/gym";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/bits";
import { Logo } from "@/components/icons";
import { rootDomain } from "@/lib/env";
import { GYM_COOKIE, slugFromHost } from "@/lib/tenant";
import { AppShell } from "./app-shell";

/** Client-side gate for /app/*. Data access is enforced by Firestore rules regardless. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, profile, signOut, isSuper } = useAuth();
  const { gym, tenantGymId } = useGym();
  const router = useRouter();
  const pathname = usePathname();
  const mismatch = status === "ready" && profile && profile.gymId !== tenantGymId;

  useEffect(() => {
    if (status === "signedOut") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  // A member's own gym is authoritative. If they landed on another tenant's host/cookie,
  // move them to their gym so branding and data line up.
  useEffect(() => {
    if (!mismatch || !profile) return;
    if (rootDomain && slugFromHost(window.location.host)) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload: tenant changed, server must re-render branding
      window.location.href = `${window.location.protocol}//${profile.gymId}.${rootDomain}${pathname}`;
    } else {
      document.cookie = `${GYM_COOKIE}=${profile.gymId}; path=/; max-age=31536000; samesite=lax`;
      window.location.reload();
    }
  }, [mismatch, profile, pathname]);

  if (status === "ready" && profile && !mismatch && gym.status === "suspended" && !isSuper) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <Logo name={gym.name} logoUrl={gym.logoUrl} />
          <h1 className="font-display text-2xl font-bold">{gym.name}&apos;s app is paused</h1>
          <p className="text-muted-foreground">Your gym&apos;s account is temporarily unavailable. Your streaks, records and bookings are safe — check with the front desk{gym.contactEmail ? <> or email <a href={`mailto:${gym.contactEmail}`}>{gym.contactEmail}</a></> : null}.</p>
          <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
        </div>
      </div>
    );
  }

  if (status === "ready" && profile && !mismatch) return <AppShell>{children}</AppShell>;

  if (status === "noProfile") {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <Logo name={gym.name} logoUrl={gym.logoUrl} />
          <h1 className="font-display text-2xl font-bold">Your profile isn&apos;t set up</h1>
          <p className="text-muted-foreground">You&apos;re signed in, but there&apos;s no member profile for this account. Finish signing up to continue.</p>
          {isSuper ? <Button asChild size="lg"><Link href="/super">Open the platform console</Link></Button> : null}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
            <Button asChild><Link href="/signup?resume=1" className="text-primary-foreground no-underline hover:no-underline">Finish signup</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true">
      <Spinner label="Loading your gym" />
    </div>
  );
}
