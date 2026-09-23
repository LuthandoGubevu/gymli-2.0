"use client";
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { getDb } from "../firebase";
import { P } from "../paths";
import type { WeightUnit } from "../types";

// `source` is part of the shape from day one so a native wrapper / OAuth import
// (Apple Health, Google Fit, Strava…) can write the same documents later.
export async function addWorkout(gymId: string, uid: string, w: { type: string; durationMin: number; date: string; notes: string }) {
  await addDoc(collection(getDb(), P.workoutLogs(gymId, uid)), { ...w, type: w.type.trim(), notes: w.notes.trim(), source: "manual", createdAt: serverTimestamp() });
}
export async function addBodyMetric(gymId: string, uid: string, m: { weight: number; unit: WeightUnit; date: string }) {
  await addDoc(collection(getDb(), P.bodyMetrics(gymId, uid)), { ...m, source: "manual", createdAt: serverTimestamp() });
}
export const deleteWorkout = (gymId: string, uid: string, id: string) => deleteDoc(doc(getDb(), P.workoutLogs(gymId, uid), id));
export const deleteBodyMetric = (gymId: string, uid: string, id: string) => deleteDoc(doc(getDb(), P.bodyMetrics(gymId, uid), id));
