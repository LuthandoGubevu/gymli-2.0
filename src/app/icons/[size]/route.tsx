// Per-tenant app icons, rendered on demand: the gym's initial on its brand colour.
// (If the gym has a logo URL, it's used instead.)
import { ImageResponse } from "next/og";
import { getTenant } from "@/lib/server/tenant";
import { brandVars, hslToHex } from "@/lib/branding";

const SIZES = new Set([180, 192, 512]);

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = SIZES.has(Number(raw)) ? Number(raw) : 192;
  const maskable = new URL(req.url).searchParams.has("maskable");
  const { gym, exists } = await getTenant();
  const bg = hslToHex(gym.brandPrimary);
  const fg = brandVars(gym.brandPrimary)["--primary-foreground"] === "0 0% 100%" ? "#FFFFFF" : "#0F172A";
  const letter = exists ? (gym.name.trim()[0] ?? "G").toUpperCase() : "g";
  const pad = maskable ? size * 0.2 : 0;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: maskable ? bg : "#0B1120" }}>
        <div style={{ width: size - pad * 2, height: size - pad * 2, borderRadius: maskable ? 0 : size * 0.22, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: fg, fontSize: (size - pad * 2) * 0.62, fontWeight: 700, lineHeight: 1 }}>
          {gym.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gym.logoUrl} width={size - pad * 2} height={size - pad * 2} style={{ objectFit: "cover", borderRadius: maskable ? 0 : size * 0.22 }} alt="" />
          ) : letter}
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } },
  );
}
