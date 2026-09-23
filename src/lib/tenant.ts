// Tenant ("which gym is this?") resolution. Order:
//   1. Subdomain of NEXT_PUBLIC_ROOT_DOMAIN     (ironworks.gymli.app → "ironworks")
//   2. `gy_gym` cookie, set by visiting /g/<slug> (single-domain deploys: gymli.app/g/ironworks)
//   3. NEXT_PUBLIC_DEFAULT_GYM_ID
// Once signed in, the member's own users/{uid}.gymId is authoritative for data access;
// the resolved tenant only drives branding and which gym a new signup joins.
import { defaultGymId, rootDomain } from "./env";

export const GYM_COOKIE = "gy_gym";
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;
const RESERVED = new Set(["www", "app", "api", "admin", "static", "assets", "g", "start"]);

export function isValidSlug(slug: string) {
  return SLUG_RE.test(slug) && !RESERVED.has(slug);
}

export function slugFromHost(host: string | null | undefined): string | null {
  if (!host || !rootDomain) return null;
  const h = host.toLowerCase().split(":")[0];
  if (h === rootDomain || !h.endsWith("." + rootDomain)) return null;
  const sub = h.slice(0, -(rootDomain.length + 1));
  if (sub.includes(".") || !isValidSlug(sub)) return null;
  return sub;
}

export function resolveGymId(host: string | null | undefined, cookieValue: string | null | undefined) {
  const fromHost = slugFromHost(host);
  if (fromHost) return { gymId: fromHost, source: "subdomain" as const };
  if (cookieValue && isValidSlug(cookieValue)) return { gymId: cookieValue, source: "cookie" as const };
  return { gymId: defaultGymId, source: "default" as const };
}

/** UX-only hint cookie so server pages can skip marketing for signed-in members. Grants nothing. */
export const AUTH_HINT_COOKIE = "gy_authed";
