import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { brandStyleTag } from "@/lib/branding";
import { getTenant } from "@/lib/server/tenant";
import { themeInitScript } from "@/lib/theme";
import { AuthProvider } from "@/components/providers/auth";
import { GymProvider } from "@/components/providers/gym";
import { CelebrationProvider } from "@/components/providers/celebration";
import { ServiceWorkerRegistrar } from "@/components/pwa/sw-register";
import "./globals.css";

// preload: false — the landing page uses Helvetica, so preloading these on every page
// triggers "preloaded but not used" warnings there. They still load via @font-face.
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap", preload: false });
const sans = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans", display: "swap", preload: false });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap", preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const { gym, exists } = await getTenant();
  const name = exists ? gym.name : "Gymli";
  return {
    title: { default: name, template: `%s · ${name}` },
    description: exists ? `${gym.name} — check in, book classes, track streaks and find a gym buddy.` : "The member app for independent gyms.",
    applicationName: name,
    manifest: "/manifest.webmanifest",
    icons: { icon: [{ url: "/icons/192", type: "image/png", sizes: "192x192" }], apple: [{ url: "/icons/180", sizes: "180x180" }] },
    appleWebApp: { capable: true, title: name, statusBarStyle: "black-translucent" },
    // Ship BOTH capability tags: Next emits mobile-web-app-capable from appleWebApp; add the Apple one explicitly.
    other: { "apple-mobile-web-app-capable": "yes" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B1120",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { gym, exists } = await getTenant();
  return (
    <html lang="en" className={`dark ${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <style id="gym-brand-ssr" dangerouslySetInnerHTML={{ __html: brandStyleTag(gym.brandPrimary) }} />
      </head>
      <body>
        <GymProvider initialGym={gym} exists={exists}>
          <AuthProvider>
            <CelebrationProvider>{children}</CelebrationProvider>
          </AuthProvider>
        </GymProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
