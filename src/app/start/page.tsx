import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Bring Gymli to your gym" };

// Gyms are onboarded by the Gymli team (the platform super admin creates them in /super),
// so this page is the "book a demo" contact point rather than a self-serve form.
export default function StartPage() {
  const subject = encodeURIComponent("Gymli demo for my gym");
  const body = encodeURIComponent("Gym name:\nCity:\nApprox. members:\nBest number to reach me:\n");
  return (
    <div className="font-helvetica flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="flex w-full max-w-[520px] animate-gy-up flex-col gap-7">
        <Link href="/" className="self-start text-foreground no-underline hover:no-underline" aria-label="Gymli home"><Logo /></Link>
        <div className="flex flex-col gap-3">
          <span className="eyebrow text-accent-ink">For gym owners</span>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em]">Put your gym on Gymli</h1>
          <p className="text-[17px] leading-[1.55] text-muted-foreground">A 20-minute demo, then we set up your branded app — your name, colours and logo — within the month.</p>
        </div>
        <ul className="flex flex-col gap-2.5">
          {["Check-in, crowd meter and class booking with waitlists", "Streaks, badges, leaderboard and Gym Buddy", "Admin dashboard, notices and an AI coach for members"].map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[15px]"><Check size={16} strokeWidth={2.5} className="mt-1 flex-none text-accent-ink" aria-hidden />{f}</li>
          ))}
        </ul>
        <Button asChild size="xl" glow className="self-start text-base">
          <a href={`mailto:hello@gymli.app?subject=${subject}&body=${body}`}>Book a demo <ArrowRight size={18} aria-hidden /></a>
        </Button>
        <p className="text-sm text-muted-foreground">Already a member of a Gymli gym? <Link href="/login" className="font-semibold">Sign in</Link></p>
      </div>
    </div>
  );
}
