import Link from "next/link";
import Image from "next/image";
import { getTenant } from "@/lib/server/tenant";
import { Logo } from "@/components/icons";
import { Toaster } from "@/components/providers/toaster";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { gym, exists } = await getTenant();
  const name = exists ? gym.name : "Gymli";
  return (
    <div className="grid min-h-dvh nav:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Hero text uses fixed light colours: it always sits on the dark photo overlay. */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 text-[hsl(210_20%_96%)] nav:flex">
        <Image src="/gym-3.jpg" alt="" fill priority sizes="55vw" className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(222_47%_6%/.55),hsl(222_47%_6%/.92))]" />
        <Link href="/" className="relative self-start text-inherit no-underline hover:no-underline" aria-label={`${name} home`}>
          <Logo name={name} logoUrl={gym.logoUrl} />
        </Link>
        <div className="relative flex max-w-[440px] flex-col gap-4">
          <span className="font-display text-[clamp(56px,6vw,88px)] font-bold leading-[.85] tracking-[-0.05em] text-primary">{exists ? gym.name : "Gymli"}</span>
          <p className="font-display text-xl font-medium leading-[1.35] tracking-[-0.01em]">Members checking in, booking classes and chasing streaks — all in one app.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="flex w-full max-w-[400px] animate-gy-up flex-col gap-7">
          <Link href="/" className="self-start text-foreground no-underline hover:no-underline nav:hidden" aria-label={`${name} home`}>
            <Logo name={name} logoUrl={gym.logoUrl} />
          </Link>
          {children}
        </div>
      </div>
      <Toaster />
    </div>
  );
}
