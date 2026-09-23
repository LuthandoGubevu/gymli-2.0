"use client";
// Live Firestore subscriptions keyed by a string, so callers don't have to memoise refs.
// State is tagged with the key it belongs to; while the key changes we report
// loading instead of calling setState synchronously inside the effect.
import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, type DocumentData, type Firestore, type Query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

interface State<T> { data: T; loading: boolean; error: Error | null }
interface Tagged<T> { key: string | null; data: T; error: Error | null }

export function useDoc<T>(path: string | null): State<(T & { id: string }) | null> {
  const [s, setS] = useState<Tagged<(T & { id: string }) | null>>({ key: null, data: null, error: null });
  useEffect(() => {
    if (!path) return;
    return onSnapshot(
      doc(getDb(), path),
      (snap) => setS({ key: path, data: snap.exists() ? ({ id: snap.id, ...(snap.data() as T) }) : null, error: null }),
      (error) => { console.warn(`[firestore] ${path}:`, error.code); setS({ key: path, data: null, error }); },
    );
  }, [path]);
  if (!path) return { data: null, loading: false, error: null };
  return s.key === path ? { data: s.data, loading: false, error: s.error } : { data: null, loading: true, error: null };
}

/** `key` identifies the query; `build` is only re-run when `key` changes. Pass key=null to skip. */
export function useQuery<T>(key: string | null, build: (db: Firestore) => Query<DocumentData>): State<(T & { id: string })[]> {
  const [s, setS] = useState<Tagged<(T & { id: string })[]>>({ key: null, data: [], error: null });
  const buildRef = useRef(build);
  useEffect(() => { buildRef.current = build; });
  useEffect(() => {
    if (!key) return;
    return onSnapshot(
      buildRef.current(getDb()),
      (snap) => setS({ key, data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })), error: null }),
      (error) => { console.warn(`[firestore] ${key}:`, error.code); setS({ key, data: [], error }); },
    );
  }, [key]);
  if (!key) return { data: EMPTY as (T & { id: string })[], loading: false, error: null };
  return s.key === key ? { data: s.data, loading: false, error: s.error } : { data: EMPTY as (T & { id: string })[], loading: true, error: null };
}

const EMPTY: never[] = [];
