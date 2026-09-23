import type { Metadata } from "next";
import { AuthGate } from "@/components/shell/auth-gate";

export const metadata: Metadata = { title: "Home" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
