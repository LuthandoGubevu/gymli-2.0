"use client";
import * as React from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { brandVars } from "@/lib/branding";
import { normalizeGym } from "@/lib/gym-defaults";
import type { Gym } from "@/lib/types";

interface GymCtx { gym: Gym; tenantGymId: string; exists: boolean }
const Ctx = React.createContext<GymCtx | null>(null);

/**
 * The gym the current host/cookie resolved to (the "tenant"). Seeded from the server
 * render so branding is correct on first paint, then kept live via onSnapshot.
 */
export function GymProvider({ initialGym, exists: initialExists, children }: { initialGym: Gym; exists: boolean; children: React.ReactNode }) {
  const [gym, setGym] = React.useState(initialGym);
  const [exists, setExists] = React.useState(initialExists);

  React.useEffect(() => {
    try {
      return onSnapshot(doc(getDb(), "gyms", initialGym.id), (s) => {
        setExists(s.exists());
        if (s.exists()) setGym(normalizeGym(s.id, s.data()));
      }, () => { /* public doc; ignore transient errors */ });
    } catch {
      return undefined; // Firebase not configured — keep server values
    }
  }, [initialGym.id]);

  // Re-apply branding when an admin changes it live.
  React.useEffect(() => {
    const vars = brandVars(gym.brandPrimary);
    let el = document.getElementById("gym-brand") as HTMLStyleElement | null;
    if (!el) { el = document.createElement("style"); el.id = "gym-brand"; document.head.appendChild(el); }
    el.textContent = `:root,.dark,.light{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`;
  }, [gym.brandPrimary]);

  const value = React.useMemo(() => ({ gym, tenantGymId: initialGym.id, exists }), [gym, initialGym.id, exists]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGym() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useGym must be used inside GymProvider");
  return v;
}
