import type { Metadata } from "next";
import { LogPage } from "@/components/member/log";

export const metadata: Metadata = { title: "Workout log" };
export default function Page() { return <LogPage />; }
