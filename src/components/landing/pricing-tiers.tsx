"use client";
import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIERS = [
  { name: "Starter", monthly: 899, band: "Up to ~150 members", highlight: false, features: ["Gymli-branded app", "Check-in, crowd meter, classes", "Gamification, notices, Gym Buddy", "Standard support"] },
  { name: "Growth", monthly: 1799, band: "~150–500 members", highlight: true, features: ["Full white-label branding", "Your colours, logo & app icon", "Everything in Starter", "Standard support"] },
  { name: "Studio+", monthly: 2999, band: "500+ members", highlight: false, features: ["Everything in Growth", "Priority support", "Priority feature requests"] },
];

const rand = (n: number) => "R" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export function PricingTiers() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const annual = billing === "annual";
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex max-w-[560px] flex-col gap-3">
          <span className="eyebrow text-accent-ink">Pricing</span>
          <h2 id="pricing-title" className="font-display text-[clamp(30px,4vw,44px)] font-bold leading-[1.05] tracking-[-0.03em]">Simple pricing, in Rand.</h2>
          <p className="text-[17px] leading-[1.55] text-muted-foreground">One flat monthly fee per gym, banded by member count. No per-member surcharges.</p>
        </div>
        <Segmented ariaLabel="Billing period" value={billing} onChange={setBilling} options={[{ value: "monthly", label: "Monthly" }, { value: "annual", label: "Annual · 2 months free" }]} itemClassName="h-9 px-3.5" />
      </div>
      <ul className="grid items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        {TIERS.map((t) => (
          <li key={t.name} className={cn("flex flex-col gap-[22px] rounded-xl border bg-card p-7", t.highlight ? "border-primary" : "border-border")}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-[22px] font-semibold leading-none">{t.name}</h3>
              {t.highlight ? <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">Most popular</span> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-1.5"><span className="font-display text-5xl font-bold leading-none tracking-[-0.035em]">{rand(annual ? (t.monthly * 10) / 12 : t.monthly)}</span><span className="text-sm text-muted-foreground">/mo excl. VAT</span></div>
              <span className="font-mono text-[13px] text-muted-foreground">{annual ? `${t.band} · billed ${rand(t.monthly * 10)}/yr` : t.band}</span>
            </div>
            <ul className="flex flex-1 flex-col gap-2.5">
              {t.features.map((f) => <li key={f} className="flex items-start gap-2.5 text-[15px] leading-[1.4]"><Check size={16} strokeWidth={2.5} className="mt-px flex-none text-accent-ink" aria-hidden />{f}</li>)}
            </ul>
            <Button asChild variant={t.highlight ? "primary" : "outline"} className="h-[46px] font-semibold"><Link href="/start">Book a demo</Link></Button>
          </li>
        ))}
      </ul>
    </>
  );
}
