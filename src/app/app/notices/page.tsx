import type { Metadata } from "next";
import { NoticesPage } from "@/components/member/notices";

export const metadata: Metadata = { title: "Notices" };
export default function Page() { return <NoticesPage />; }
