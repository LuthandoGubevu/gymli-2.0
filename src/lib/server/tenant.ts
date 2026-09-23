import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { firebaseConfigured } from "../env";
import { normalizeGym } from "../gym-defaults";
import { GYM_COOKIE, resolveGymId } from "../tenant";
import { getDocument } from "./firestore-rest";

/** Resolves the tenant for this request and loads its public gym doc (cached 60s). */
export const getTenant = cache(async () => {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const { gymId, source } = resolveGymId(h.get("x-forwarded-host") ?? h.get("host"), c.get(GYM_COOKIE)?.value);
  let raw: Record<string, unknown> | null = null;
  if (firebaseConfigured) {
    try {
      raw = await getDocument(`gyms/${gymId}`, { revalidate: 60 });
    } catch (e) {
      console.warn("[tenant] could not load gym", gymId, e instanceof Error ? e.message : e);
    }
  }
  return { gymId, source, exists: raw !== null, gym: normalizeGym(gymId, raw) };
});
