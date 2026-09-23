import type { Metadata } from "next";
import { BuddyChat } from "@/components/member/buddy-chat";

export const metadata: Metadata = { title: "Chat" };
export default async function Page({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  return <BuddyChat matchId={matchId} />;
}
