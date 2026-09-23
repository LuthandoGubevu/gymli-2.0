"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/components/providers/auth";
import { Spinner } from "@/components/ui/bits";

/** UI gate only — every admin read/write is independently enforced by Firestore rules. */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useMe();
  const router = useRouter();
  useEffect(() => { if (!isAdmin) router.replace("/app"); }, [isAdmin, router]);
  if (!isAdmin) return <div className="grid place-items-center py-20"><Spinner /></div>;
  return <>{children}</>;
}
