import type { Gym } from "./types";
import { DEFAULT_BRAND } from "./branding";
import { DEFAULT_TZ } from "./dates";

export function gymDefaults(id: string, name = "Gymli"): Gym {
  return {
    id, name, ownerUid: "", address: "", timezone: DEFAULT_TZ, latitude: null, longitude: null, geofenceRadiusM: 100,
    thresholdLow: 20, thresholdModerate: 50, thresholdPacked: 80, brandPrimary: DEFAULT_BRAND, logoUrl: "",
    promoTags: [], generalNotice: "", offerExpiry: null, contactEmail: "", contactPhone: "", openHour: 5, closeHour: 21,
  };
}

/** Normalises a raw gym document (from the SDK or REST) into a full Gym. */
export function normalizeGym(id: string, raw: Record<string, unknown> | null | undefined): Gym {
  const d = gymDefaults(id);
  if (!raw) return d;
  const pick = <K extends keyof Gym>(k: K) => (raw[k] !== undefined && raw[k] !== null ? (raw[k] as Gym[K]) : d[k]);
  return {
    ...d,
    name: pick("name"), ownerUid: pick("ownerUid"), address: pick("address"), timezone: pick("timezone"),
    latitude: (raw.latitude as number | null) ?? null, longitude: (raw.longitude as number | null) ?? null,
    geofenceRadiusM: pick("geofenceRadiusM"), thresholdLow: pick("thresholdLow"), thresholdModerate: pick("thresholdModerate"),
    thresholdPacked: pick("thresholdPacked"), brandPrimary: pick("brandPrimary"), logoUrl: pick("logoUrl"), promoTags: pick("promoTags"),
    generalNotice: pick("generalNotice"), offerExpiry: (raw.offerExpiry as string | null) ?? null, contactEmail: pick("contactEmail"),
    contactPhone: pick("contactPhone"), openHour: pick("openHour"), closeHour: pick("closeHour"),
  };
}
