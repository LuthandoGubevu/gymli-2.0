"use client";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDb } from "../firebase";
import { P } from "../paths";
import type { Trainer } from "../types";

export async function requestTrainerSession(gymId: string, member: { uid: string; name: string }, t: Trainer, req: { date: string; time: string; note: string }) {
  await addDoc(collection(getDb(), P.trainerBookings(gymId)), {
    userId: member.uid, userName: member.name, trainerId: t.id, trainerName: t.name, requestedDate: req.date, requestedTime: req.time,
    note: req.note.trim(), status: "pending", createdAt: serverTimestamp(), decidedAt: null,
  });
}

export async function cancelTrainerRequest(gymId: string, id: string) {
  await updateDoc(doc(getDb(), P.trainerBookings(gymId), id), { status: "cancelled" });
}
