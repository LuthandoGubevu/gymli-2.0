import type { Metadata } from "next";
import { BuddyPage } from "@/components/member/buddy";

export const metadata: Metadata = { title: "Gym Buddy" };
export default function Page() { return <BuddyPage />; }
