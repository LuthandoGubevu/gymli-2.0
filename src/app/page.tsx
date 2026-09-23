import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowRight, Flame, Megaphone } from "lucide-react";
import { getTenant } from "@/lib/server/tenant";
import { AUTH_HINT_COOKIE } from "@/lib/tenant";
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { LandingThemeToggle } from "@/components/landing/theme-toggle";
import { Features, Pricing } from "@/components/landing/sections";

export default async function Home() {
  const [{ source, exists }, c] = await Promise.all([getTenant(), cookies()]);
  // Signed-in members skip marketing entirely (hint cookie; the app re-checks auth).
  if (c.get(AUTH_HINT_COOKIE)?.value === "1") redirect("/app");
  // A gym's own subdomain is its members' front door, not a sales page.
  if (source === "subdomain" && exists) redirect("/login");

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-glass px-[clamp(16px,4vw,48px)] py-3.5 backdrop-blur-[14px]">
        <Logo />
        <nav className="flex items-center gap-1.5" aria-label="Site">
          <a href="#features" className="hidden px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:no-underline nav:block">Features</a>
          <a href="#pricing" className="hidden px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:no-underline nav:block">Pricing</a>
          <LandingThemeToggle />
          <Button asChild variant="outline" size="md"><Link href="/login">Member login</Link></Button>
        </nav>
      </header>

      <main>
        <section className="relative flex min-h-[640px] items-center overflow-hidden" aria-labelledby="hero-title">
          <Image src="/gym-1.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(222_47%_6%/.96)_0%,hsl(222_47%_6%/.82)_48%,hsl(222_47%_6%/.5)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-t from-background to-transparent" />
          <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-12 px-[clamp(16px,4vw,48px)] pb-24 pt-[72px] [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
            {/* Hero text uses fixed light colours in both themes: it always sits on the dark photo overlay. */}
            <div className="flex flex-col gap-6 text-[hsl(210_20%_96%)]">
              <span className="self-start whitespace-nowrap rounded-full border border-primary/35 bg-primary/10 px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-[.08em] text-primary">Built for independent gyms</span>
              <h1 id="hero-title" className="font-display text-[clamp(40px,6vw,72px)] font-bold leading-[.98] tracking-[-0.035em] [text-wrap:balance]">
                Your gym&apos;s own app. <span className="text-primary">Live this month.</span>
              </h1>
              <p className="max-w-[480px] text-lg leading-[1.55] text-[hsl(215_20%_78%)] [text-wrap:pretty]">
                Check-in, a live crowd meter, class bookings, streaks and a Gym Buddy matcher — branded as your gym, priced and billed in Rand.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="hero" className="shadow-[0_10px_36px_-8px_hsl(var(--primary)/.6)]"><Link href="/start">Book a demo <ArrowRight size={18} aria-hidden /></Link></Button>
                <Button asChild variant="outline" size="hero" className="border-[hsl(222_20%_32%)] font-medium text-[hsl(210_20%_96%)] hover:bg-white/5 hover:text-[hsl(210_20%_96%)]"><a href="#pricing">See pricing</a></Button>
              </div>
            </div>
            <div className="flex w-full max-w-[360px] flex-col gap-3.5 justify-self-center rounded-xl border border-[hsl(222_20%_26%)] bg-[hsl(222_41%_14%/.62)] p-[22px] text-[hsl(210_20%_96%)] backdrop-blur-[18px]" aria-hidden>
              <div className="flex items-center justify-between"><span className="text-sm font-semibold">Gymli</span><span className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-[.06em] text-[hsl(142_70%_50%)]"><span className="live-dot" />LIVE</span></div>
              <div className="flex flex-col gap-2.5 rounded-lg border border-[hsl(222_20%_22%)] bg-[hsl(222_41%_10%/.7)] p-4">
                <span className="font-mono text-[11px] font-medium tracking-[.08em] text-[hsl(215_15%_65%)]">CROWD RIGHT NOW</span>
                <div className="flex items-baseline gap-2"><span className="num font-display text-5xl font-bold leading-[.9]">38</span><span className="text-sm text-[hsl(215_15%_65%)]">in · Moderate</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(222_24%_19%)]"><div className="h-full w-[48%] rounded-full bg-[hsl(38_90%_55%)]" /></div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-[hsl(222_20%_22%)] bg-[hsl(222_41%_10%/.7)] px-4 py-3.5">
                <Flame size={22} className="text-primary" />
                <div className="flex-1"><div className="text-sm font-semibold">13-day streak</div><div className="text-xs text-[hsl(215_15%_65%)]">Check in today to keep it</div></div>
                <span className="font-display text-[26px] font-bold leading-none">13</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-[hsl(222_20%_22%)] bg-[hsl(222_41%_10%/.7)] px-4 py-3.5">
                <Megaphone size={20} className="text-primary" />
                <div><div className="text-sm font-semibold">Heritage Day hours</div><div className="text-xs text-[hsl(215_15%_65%)]">Posted by your gym · 2h ago</div></div>
              </div>
            </div>
          </div>
        </section>

        <Features />
        <Pricing />

        <section className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,48px)] pb-[72px]">
          <div className="relative flex min-h-[280px] items-center overflow-hidden rounded-2xl border border-border">
            <Image src="/gym-3.jpg" alt="" fill sizes="(max-width: 1200px) 100vw, 1200px" className="object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(222_47%_6%/.94),hsl(222_47%_6%/.6))]" />
            <div className="relative flex max-w-[620px] flex-col gap-[18px] px-[clamp(20px,4vw,56px)] py-10 text-[hsl(210_20%_96%)]">
              <h2 className="font-display text-[clamp(28px,3.6vw,40px)] font-bold leading-[1.05] tracking-[-0.03em] [text-wrap:balance]">See it running with your gym&apos;s name on it.</h2>
              <p className="text-base leading-normal text-[hsl(215_20%_78%)]">A 20-minute demo, then a branded build within the month.</p>
              <Button asChild size="xl" className="self-start"><Link href={exists ? "/login" : "/start"}>{exists ? "Try the member app" : "Set up your gym"} <ArrowRight size={18} aria-hidden /></Link></Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-wrap justify-between gap-3 border-t border-border px-[clamp(16px,4vw,48px)] py-7 font-mono text-[13px] text-muted-foreground">
        <span>© 2026 Gymli · Made in South Africa</span>
        <a href="mailto:hello@gymli.app" className="text-muted-foreground">hello@gymli.app</a>
      </footer>
    </div>
  );
}
