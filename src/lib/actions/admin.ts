"use client";
import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { getDb } from "../firebase";
import { P } from "../paths";
import type { Gym, GymClass, Role, Trainer, TrainerBooking } from "../types";
import { fmtKey } from "../dates";
import { notify } from "./notify";

export async function saveClass(gymId: string, id: string | null, c: Omit<GymClass, "id">) {
  const db = getDb();
  if (id) await setDoc(doc(db, P.classes(gymId), id), c);
  else await addDoc(collection(db, P.classes(gymId)), c);
}
export const deleteClass = (gymId: string, id: string) => deleteDoc(doc(getDb(), P.classes(gymId), id));

export async function saveTrainer(gymId: string, id: string | null, t: Omit<Trainer, "id">) {
  const db = getDb();
  if (id) await setDoc(doc(db, P.trainers(gymId), id), t);
  else await addDoc(collection(db, P.trainers(gymId)), t);
}
export const deleteTrainer = (gymId: string, id: string) => deleteDoc(doc(getDb(), P.trainers(gymId), id));

export async function decideTrainerBooking(gymId: string, b: TrainerBooking, status: "accepted" | "declined") {
  await updateDoc(doc(getDb(), P.trainerBookings(gymId), b.id), { status, decidedAt: serverTimestamp() });
  await notify(b.userId, {
    type: "trainer_booking",
    title: status === "accepted" ? `Session confirmed with ${b.trainerName}` : `${b.trainerName} can't make that time`,
    body: status === "accepted" ? `${fmtKey(b.requestedDate, "weekdayDay")} at ${b.requestedTime}. See you there.` : "Your request was declined — try another slot.",
    link: "/app/trainers",
  });
}

export async function updateGym(gym: Gym, patch: Partial<Omit<Gym, "id" | "ownerUid" | "createdAt">>) {
  const { id, createdAt, ...rest } = { ...gym, ...patch };
  void createdAt;
  await setDoc(doc(getDb(), P.gym(id)), rest, { merge: true });
}

export async function setMemberRole(gymId: string, uid: string, role: Role) {
  const db = getDb();
  const b = writeBatch(db);
  b.update(doc(db, P.user(uid)), { role });
  b.update(doc(db, P.memberProfile(gymId, uid)), { role });
  await b.commit();
}
