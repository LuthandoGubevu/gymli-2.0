import type { Metadata } from "next";
import { TrainersPage } from "@/components/member/trainers";

export const metadata: Metadata = { title: "Trainers" };
export default function Page() { return <TrainersPage />; }
