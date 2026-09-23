"use client";
import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { getDb } from "../firebase";
import { P } from "../paths";
import type { NoticeTag } from "../types";

export async function postNotice(gymId: string, author: { uid: string; name: string }, n: { title: string; body: string; tag: NoticeTag }) {
  await addDoc(collection(getDb(), P.notices(gymId)), { title: n.title.trim(), body: n.body.trim(), tag: n.tag, authorName: author.name, authorUid: author.uid, createdAt: serverTimestamp() });
}

export async function deleteNotice(gymId: string, id: string) {
  await deleteDoc(doc(getDb(), P.notices(gymId), id));
}

export async function markNoticeRead(uid: string, noticeId: string) {
  await setDoc(doc(getDb(), P.noticeReads(uid), noticeId), { readAt: serverTimestamp() });
}

export async function markNoticesRead(uid: string, ids: string[]) {
  const db = getDb();
  for (let i = 0; i < ids.length; i += 400) {
    const b = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => b.set(doc(db, P.noticeReads(uid), id), { readAt: serverTimestamp() }));
    await b.commit();
  }
}

export async function markNotificationRead(uid: string, id: string) {
  await updateDoc(doc(getDb(), P.notifications(uid), id), { readAt: serverTimestamp() });
}

export async function markNotificationsRead(uid: string, ids: string[]) {
  const db = getDb();
  const b = writeBatch(db);
  ids.forEach((id) => b.update(doc(db, P.notifications(uid), id), { readAt: serverTimestamp() }));
  await b.commit();
}
