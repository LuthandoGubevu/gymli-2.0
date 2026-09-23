import type { Metadata } from "next";
import { CoachPage } from "@/components/member/coach";

export const metadata: Metadata = { title: "AI coach" };
export default function Page() { return <CoachPage />; }
