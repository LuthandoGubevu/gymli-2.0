"use client";
import { useMemo } from "react";
import { useNoticeReads, useNotices } from "./use-data";
import type { Notice, UserProfile } from "@/lib/types";

const GRACE_MS = 14 * 86400000; // notices up to 2 weeks before signup still count as new

export function useNoticeState(me: UserProfile) {
  const notices = useNotices(me.gymId);
  const reads = useNoticeReads(me.uid);
  return useMemo(() => {
    const readSet = new Set(reads.data.map((r) => r.id));
    const joined = me.createdAt?.toMillis?.() ?? 0;
    const isUnread = (n: Notice) => !readSet.has(n.id) && (n.createdAt?.toMillis?.() ?? Infinity) > joined - GRACE_MS && n.authorUid !== me.uid;
    const unreadIds = notices.data.filter(isUnread).map((n) => n.id);
    return { notices: notices.data, loading: notices.loading, isUnread, unreadIds, unread: unreadIds.length };
  }, [notices.data, notices.loading, reads.data, me.createdAt, me.uid]);
}
