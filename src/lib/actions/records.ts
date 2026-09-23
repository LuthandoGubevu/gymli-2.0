"use client";
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDb } from "../firebase";
import { P } from "../paths";
import type { Gamification, PersonalRecord, WeightUnit } from "../types";
import { awardBadges } from "./checkin";
import { badgeInputs } from "../badges";

export const exerciseKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
export const toKg = (v: number, u: WeightUnit) => (u === "kg" ? v : v * 0.45359237);
export const round1 = (n: number) => Math.round(n * 10) / 10;

export interface SavePRResult { kind: "first" | "improved"; delta: number; record: Omit<PersonalRecord, "id">; newBadges: string[] }

/** Logs a PR. One doc per exercise; a new PR must beat the stored best (compared in kg). */
export async function logPR(gymId: string, uid: string, existing: PersonalRecord | undefined, input: { exercise: string; value: number; unit: WeightUnit; date: string }, gamification: Gamification | null): Promise<SavePRResult> {
  const db = getDb();
  const col = collection(db, P.records(gymId, uid));
  let result: SavePRResult;
  if (existing) {
    if (toKg(input.value, input.unit) <= toKg(existing.value, existing.unit)) throw new Error(`Your best is ${existing.value} ${existing.unit} — a PR has to beat it.`);
    const record = { exercise: existing.exercise, exerciseKey: existing.exerciseKey, value: input.value, unit: input.unit, date: input.date, previousValue: existing.unit === input.unit ? existing.value : round1(input.unit === "kg" ? toKg(existing.value, existing.unit) : existing.value / 0.45359237) };
    await updateDoc(doc(col, existing.id), { ...record, updatedAt: serverTimestamp() });
    result = { kind: "improved", delta: round1(input.value - (record.previousValue ?? 0)), record, newBadges: [] };
  } else {
    const record = { exercise: input.exercise.trim(), exerciseKey: exerciseKey(input.exercise), value: input.value, unit: input.unit, date: input.date, previousValue: null };
    await addDoc(col, { ...record, updatedAt: serverTimestamp() });
    result = { kind: "first", delta: 0, record, newBadges: [] };
  }
  const count = (await getDocs(col)).size;
  result.newBadges = await awardBadges(gymId, uid, badgeInputs(gamification, count));
  return result;
}

/** Correct a typo — doesn't enforce "must beat", doesn't touch previousValue. */
export async function editPR(gymId: string, uid: string, id: string, patch: { exercise: string; value: number; unit: WeightUnit; date: string }) {
  await updateDoc(doc(getDb(), P.records(gymId, uid), id), { ...patch, exercise: patch.exercise.trim(), exerciseKey: exerciseKey(patch.exercise), updatedAt: serverTimestamp() });
}

export async function deletePR(gymId: string, uid: string, id: string) {
  await deleteDoc(doc(getDb(), P.records(gymId, uid), id));
}
