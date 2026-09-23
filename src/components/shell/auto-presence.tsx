"use client";
// Geofence auto check-in/out. Opt-in (users/{uid}.autoPresenceEnabled). Watches position
// while the app is open; enters → check in (source "geo"), leaves (1.5× radius, hysteresis)
// → check out, but only if this device checked in by geo.
import { useEffect, useRef } from "react";
import { useGym } from "@/components/providers/gym";
import { useCelebrate } from "@/components/providers/celebration";
import { checkIn, checkOut } from "@/lib/actions/checkin";
import { useMyPresence } from "@/hooks/use-data";
import { toast } from "@/lib/toast";
import type { UserProfile } from "@/lib/types";
import { celebrateCheckIn } from "@/lib/celebrations";

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function AutoPresence({ me }: { me: UserProfile }) {
  const { gym } = useGym();
  const celebrate = useCelebrate();
  const presence = useMyPresence(me.gymId, me.uid);
  const busy = useRef(false);
  const state = useRef({ active: false, source: "manual" as string });
  useEffect(() => { state.current = { active: !!presence.data?.isActive, source: presence.data?.source ?? "manual" }; }, [presence.data]);

  const enabled = me.autoPresenceEnabled && gym.latitude !== null && gym.longitude !== null && typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    if (!enabled || presence.loading) return;
    const center = { lat: gym.latitude!, lng: gym.longitude! };
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        if (busy.current) return;
        const d = distanceMeters(center, { lat: pos.coords.latitude, lng: pos.coords.longitude });
        const inside = d <= gym.geofenceRadiusM + Math.min(pos.coords.accuracy, 50);
        busy.current = true;
        try {
          if (inside && !state.current.active) {
            state.current.active = true;
            const r = await checkIn(gym, me, "geo");
            if (r.firstToday) celebrateCheckIn(celebrate, r, "Auto checked in");
          } else if (!inside && d > gym.geofenceRadiusM * 1.5 && state.current.active && state.current.source === "geo") {
            state.current.active = false;
            await checkOut(me.gymId, me.uid);
            toast("Auto checked out — see you next time", "map-pin", "muted");
          }
        } catch (e) {
          console.warn("auto presence", e);
        } finally {
          busy.current = false;
        }
      },
      (err) => console.warn("geolocation", err.message),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled, presence.loading, gym, me, celebrate]);

  return null;
}
