"use client";
import { collection, doc, getDoc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { getDb } from "../firebase";
import { P, matchIdFor } from "../paths";
import type { BuddySwipe, SwipeAction, UserProfile } from "../types";
import { fullName } from "../utils";
import { notify } from "./notify";

/** Records a like/pass. On a mutual like, creates the match (rules verify both likes) and notifies both. */
export async function swipe(me: UserProfile, target: { uid: string; firstName: string; lastName: string }, action: SwipeAction): Promise<{ matched: boolean; matchId?: string }> {
  const db = getDb();
  const g = me.gymId;
  await setDoc(doc(db, P.swipe(g, me.uid, target.uid)), { fromUserId: me.uid, toUserId: target.uid, action, createdAt: serverTimestamp() });
  if (action !== "like") return { matched: false };
  const reverse = await getDoc(doc(db, P.swipe(g, target.uid, me.uid)));
  if (!reverse.exists() || (reverse.data() as BuddySwipe).action !== "like") return { matched: false };
  const matchId = matchIdFor(me.uid, target.uid);
  const members = [me.uid, target.uid].sort();
  try {
    await setDoc(doc(db, P.match(g, matchId)), {
      members, memberNames: { [me.uid]: fullName(me), [target.uid]: fullName(target) },
      createdAt: serverTimestamp(), lastMessage: "", lastMessageAt: null, lastSenderId: null,
    });
  } catch (e) {
    // Already matched (e.g. both liked at the same moment) — treat as matched.
    console.warn("match create", e);
  }
  await Promise.all([
    notify(target.uid, { type: "buddy_match", title: "It's a match!", body: `You and ${me.firstName} both want to train together. Say hi.`, link: `/app/buddy/${matchId}` }),
    notify(me.uid, { type: "buddy_match", title: "It's a match!", body: `You and ${target.firstName} both want to train together. Say hi.`, link: `/app/buddy/${matchId}` }),
  ]);
  return { matched: true, matchId };
}

export async function sendMessage(gymId: string, matchId: string, senderId: string, text: string) {
  const db = getDb();
  const clean = text.trim().slice(0, 1000);
  if (!clean) return;
  const b = writeBatch(db);
  b.set(doc(collection(db, P.messages(gymId, matchId))), { senderId, text: clean, createdAt: serverTimestamp() });
  b.update(doc(db, P.match(gymId, matchId)), { lastMessage: clean.slice(0, 140), lastMessageAt: serverTimestamp(), lastSenderId: senderId });
  await b.commit();
}

