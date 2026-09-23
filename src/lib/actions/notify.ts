"use client";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb } from "../firebase";
import { P } from "../paths";
import type { NotificationType } from "../types";

/** Writes an in-app notification to another member (or yourself). Never throws: a failed
 *  notification must not undo the action that triggered it. */
export async function notify(toUid: string, n: { type: NotificationType; title: string; body: string; link: string }) {
  try {
    await addDoc(collection(getDb(), P.notifications(toUid)), { ...n, readAt: null, createdAt: serverTimestamp() });
  } catch (e) {
    console.warn("notify failed", e);
  }
}
