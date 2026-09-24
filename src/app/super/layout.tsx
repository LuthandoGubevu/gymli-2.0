import type { Metadata } from "next";
import { SuperGate } from "@/components/super/super-gate";

export const metadata: Metadata = { title: "Platform", robots: { index: false, follow: false } };

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  return <SuperGate>{children}</SuperGate>;
}
