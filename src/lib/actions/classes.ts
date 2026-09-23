"use client";
import { arrayUnion, doc, runTransaction, serverTimestamp, type Transaction } from "firebase/firestore";
import { getDb } from "../firebase";
import { P } from "../paths";
import type { ClassBooking, ClassSlot, GymClass } from "../types";
import { fmtKey } from "../dates";
import { notify } from "./notify";

export type BookResult = { status: "confirmed"; spotsLeft: number } | { status: "waitlisted"; position: number };

/** Books a class occurrence, or joins its waitlist when full (never fails for being full). */
export async function bookClass(gymId: string, member: { uid: string; name: string }, cls: GymClass, date: string): Promise<BookResult> {
  const db = getDb();
  const slotId = `${cls.id}_${date}`;
  const slotRef = doc(db, P.classSlot(gymId, cls.id, date));
  const bookingRef = doc(db, P.classBooking(gymId, slotId, member.uid));
  return runTransaction(db, async (tx) => {
    const [slotSnap, bSnap] = await Promise.all([tx.get(slotRef), tx.get(bookingRef)]);
    const prev = bSnap.data() as ClassBooking | undefined;
    if (prev && prev.status !== "cancelled") throw new Error(prev.status === "confirmed" ? "You're already booked." : "You're already on the waitlist.");
    let result: BookResult;
    if (!slotSnap.exists()) {
      tx.set(slotRef, { classId: cls.id, date, capacity: cls.capacity, confirmedCount: 1, waitlistOrder: [] });
      result = { status: "confirmed", spotsLeft: cls.capacity - 1 };
    } else {
      const s = slotSnap.data() as ClassSlot;
      if (s.confirmedCount < s.capacity) {
        tx.update(slotRef, { confirmedCount: s.confirmedCount + 1 });
        result = { status: "confirmed", spotsLeft: s.capacity - s.confirmedCount - 1 };
      } else {
        tx.update(slotRef, { waitlistOrder: arrayUnion(member.uid) });
        result = { status: "waitlisted", position: s.waitlistOrder.filter((u) => u !== member.uid).length + 1 };
      }
    }
    tx.set(bookingRef, {
      userId: member.uid, userName: member.name, classId: cls.id, className: cls.name, slotId, date, time: cls.time,
      status: result.status, waitlistPosition: result.status === "waitlisted" ? result.position : null,
      createdAt: prev?.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return result;
  });
}

function cancelInTx(tx: Transaction, gymId: string, slot: ClassSlot, booking: ClassBooking, allowPromotion: boolean) {
  const db = getDb();
  const slotRef = doc(db, P.classSlot(gymId, slot.classId, slot.date));
  let promoted: string | null = null;
  if (booking.status === "confirmed") {
    const next = slot.waitlistOrder[0];
    if (allowPromotion && next) {
      promoted = next;
      tx.update(slotRef, { waitlistOrder: slot.waitlistOrder.slice(1) });
      tx.update(doc(db, P.classBooking(gymId, booking.slotId, next)), { status: "confirmed", waitlistPosition: null, updatedAt: serverTimestamp() });
    } else {
      tx.update(slotRef, { confirmedCount: Math.max(0, slot.confirmedCount - 1) });
    }
  } else if (booking.status === "waitlisted") {
    tx.update(slotRef, { waitlistOrder: slot.waitlistOrder.filter((u) => u !== booking.userId) });
  }
  tx.update(doc(db, P.classBooking(gymId, booking.slotId, booking.userId)), { status: "cancelled", waitlistPosition: null, updatedAt: serverTimestamp() });
  return promoted;
}

/**
 * Cancels a booking (the member's own, or any booking when called by an admin).
 * If a confirmed seat frees up and there's a waitlist, the earliest member is promoted
 * in the same transaction and notified.
 */
export async function cancelBooking(gymId: string, booking: ClassBooking): Promise<{ promoted: string | null }> {
  const db = getDb();
  const slotRef = doc(db, `${P.classSlots(gymId)}/${booking.slotId}`);
  const bookingRef = doc(db, P.classBooking(gymId, booking.slotId, booking.userId));
  const run = (allowPromotion: boolean) => runTransaction(db, async (tx) => {
    const [slotSnap, bSnap] = await Promise.all([tx.get(slotRef), tx.get(bookingRef)]);
    if (!bSnap.exists() || !slotSnap.exists()) throw new Error("Booking not found.");
    const b = bSnap.data() as ClassBooking;
    if (b.status === "cancelled") return null;
    return cancelInTx(tx, gymId, { ...(slotSnap.data() as ClassSlot) }, { ...b, userId: booking.userId, slotId: booking.slotId }, allowPromotion);
  });
  let promoted: string | null;
  try {
    promoted = await run(true);
  } catch (e) {
    // The waitlisted booking we tried to promote was inconsistent (e.g. already cancelled).
    // Don't block the cancellation on it — free the seat instead.
    if ((e as { code?: string }).code !== "permission-denied") throw e;
    promoted = await run(false);
  }
  if (promoted) {
    await notify(promoted, {
      type: "waitlist_promoted",
      title: `You're in — ${booking.className}`,
      body: `A spot opened up for ${fmtKey(booking.date, "weekdayDay")} at ${booking.time}. You've been moved off the waitlist.`,
      link: "/app/classes",
    });
  }
  return { promoted };
}
