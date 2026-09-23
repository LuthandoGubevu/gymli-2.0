import type { Metadata } from "next";
import { CrowdMeter } from "@/components/member/crowd-meter";

export const metadata: Metadata = { title: "Crowd meter" };
export default function Page() { return <CrowdMeter />; }
