import type { Metadata } from "next";
import { BadgesPage } from "@/components/member/badges";

export const metadata: Metadata = { title: "Badges" };
export default function Page() { return <BadgesPage />; }
