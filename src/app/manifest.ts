import type { MetadataRoute } from "next";
import { getTenant } from "@/lib/server/tenant";
import { hslToHex } from "@/lib/branding";

// Per-tenant manifest: each gym's installed app gets its own name, colour and icon.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { gym, exists } = await getTenant();
  const name = exists ? gym.name : "Gymli";
  return {
    id: `/?gym=${gym.id}`,
    name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description: `${name} — check in, book classes, chase streaks.`,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B1120",
    theme_color: hslToHex(gym.brandPrimary),
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
