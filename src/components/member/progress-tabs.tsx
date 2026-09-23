"use client";
import { usePathname, useRouter } from "next/navigation";
import { Segmented } from "@/components/ui/segmented";

const TABS = [
  { value: "/app/records", label: "Records" },
  { value: "/app/leaderboard", label: "Leaderboard" },
  { value: "/app/badges", label: "Badges" },
  { value: "/app/coach", label: "AI coach" },
  { value: "/app/log", label: "Log" },
];

/** "Progress" groups these pages behind one segmented control (mobile tab + desktop). */
export function ProgressTabs() {
  const pathname = usePathname();
  const router = useRouter();
  return <Segmented ariaLabel="Progress sections" options={TABS} value={TABS.find((t) => pathname.startsWith(t.value))?.value ?? TABS[0].value} onChange={(v) => router.push(v)} className="-mb-1" />;
}

export function SubTabs({ tabs, label }: { tabs: { value: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  const router = useRouter();
  return <Segmented ariaLabel={label} options={tabs} value={tabs.find((t) => pathname === t.value || pathname.startsWith(t.value + "/"))?.value ?? tabs[0].value} onChange={(v) => router.push(v)} className="-mb-1" />;
}
