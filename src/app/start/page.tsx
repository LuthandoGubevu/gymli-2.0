import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/icons";
import { StartWizard } from "./start-wizard";

export const metadata: Metadata = { title: "Set up your gym" };

export default function StartPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="flex w-full max-w-[460px] animate-gy-up flex-col gap-7">
        <Link href="/" className="self-start text-foreground no-underline hover:no-underline" aria-label="Gymli home"><Logo /></Link>
        <StartWizard />
      </div>
    </div>
  );
}
