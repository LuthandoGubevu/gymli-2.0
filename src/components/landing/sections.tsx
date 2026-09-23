import { Activity, CalendarDays, Flame, Heart, Megaphone, Sparkles } from "lucide-react";
import { PricingTiers } from "./pricing-tiers";

const FEATURES = [
  { icon: Activity, title: "Check-in & crowd meter", body: "Members see how busy the gym is before they leave home — fewer no-shows, better peak-hour spread." },
  { icon: CalendarDays, title: "Class & trainer booking", body: "Waitlists fill automatically when a spot opens, so a cancellation never leaves a class half-empty." },
  { icon: Flame, title: "Streaks, badges & leaderboard", body: "Members come back for the streak, not just the workout — retention built in." },
  { icon: Sparkles, title: "AI coach", body: "Every member gets a weekly plan generated from their own goals and progress." },
  { icon: Megaphone, title: "Admin notices", body: "Post a closure, promo or schedule change once — every member sees it on their home screen." },
  { icon: Heart, title: "Gym Buddy matching", body: "Members match with a training partner from your own gym. A reason to show up." },
];

export function Features() {
  return (
    <section id="features" className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-col gap-10 px-[clamp(16px,4vw,48px)] py-[72px]" aria-labelledby="features-title">
      <div className="flex max-w-[640px] flex-col gap-3.5">
        <span className="eyebrow text-accent-ink">What members get</span>
        <h2 id="features-title" className="font-display text-[clamp(30px,4vw,44px)] font-bold leading-[1.05] tracking-[-0.03em] [text-wrap:balance]">Everything a member app needs. Nothing it doesn&apos;t.</h2>
        <p className="text-[17px] leading-[1.55] text-muted-foreground">Built for how independent gyms actually run — not a bloated suite you&apos;ll only use a third of.</p>
      </div>
      <ul className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        {FEATURES.map((f) => (
          <li key={f.title} className="surface surface-hover flex flex-col gap-3.5 p-6">
            <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-primary-soft text-accent-ink" aria-hidden><f.icon size={22} /></span>
            <h3 className="font-display text-lg font-semibold leading-tight tracking-[-0.01em]">{f.title}</h3>
            <p className="text-[15px] leading-[1.55] text-muted-foreground [text-wrap:pretty]">{f.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto flex max-w-[1200px] scroll-mt-20 flex-col gap-8 px-[clamp(16px,4vw,48px)] pb-[72px] pt-6" aria-labelledby="pricing-title">
      <PricingTiers />
    </section>
  );
}
