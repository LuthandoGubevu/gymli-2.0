import type { Metadata } from "next";
import { LeaderboardPage } from "@/components/member/leaderboard";

export const metadata: Metadata = { title: "Leaderboard" };
export default function Page() { return <LeaderboardPage />; }
