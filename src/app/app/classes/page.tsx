import type { Metadata } from "next";
import { ClassesPage } from "@/components/member/classes";

export const metadata: Metadata = { title: "Classes" };
export default function Page() { return <ClassesPage />; }
