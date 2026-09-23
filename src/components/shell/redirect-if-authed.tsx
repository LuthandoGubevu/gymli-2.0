"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth";

/** Sends signed-in members with a profile straight into the app. */
export function RedirectIfAuthed() {
  const { status } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    if (status !== "ready") return;
    const next = params.get("next");
    router.replace(next && next.startsWith("/app") ? next : "/app");
  }, [status, router, params]);
  return null;
}
