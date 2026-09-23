import type { Metadata } from "next";
import { RecordsPage } from "@/components/member/records";

export const metadata: Metadata = { title: "Personal records" };
export default function Page() { return <RecordsPage />; }
