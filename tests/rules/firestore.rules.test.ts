// Security rules tests. Run with: npm run test:rules (starts the Firestore emulator).
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, writeBatch, serverTimestamp, addDoc, increment, arrayUnion, arrayRemove, runTransaction } from "firebase/firestore";

let env: RulesTestEnvironment;
const G = "ironworks";
const OTHER = "otherGym";

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "gyms", G), { name: "Ironworks", ownerUid: "owner", brandPrimary: "45 93% 52%", thresholdLow: 20, thresholdModerate: 50, thresholdPacked: 80, geofenceRadiusM: 100 });
    await setDoc(doc(db, "gyms", OTHER), { name: "Other", ownerUid: "x", brandPrimary: "200 80% 50%" });
    const users: [string, string, string, boolean][] = [["owner", G, "admin", false], ["admin2", G, "admin", false], ["alice", G, "user", true], ["bob", G, "user", true], ["carol", G, "user", false], ["mallory", OTHER, "user", true]];
    for (const [uid, gymId, role, buddy] of users) {
      await setDoc(doc(db, "users", uid), { uid, gymId, role, firstName: uid, username: uid, email: `${uid}@x.com`, buddyOptIn: buddy, leaderboardOptIn: true });
      await setDoc(doc(db, "gyms", gymId, "memberProfiles", uid), { uid, role, firstName: uid, buddyOptIn: buddy, leaderboardOptIn: true });
    }
    await setDoc(doc(db, "gyms", G, "classes", "hiit"), { name: "HIIT", day: "Thu", time: "07:00", capacity: 1, durationMin: 45 });
    await setDoc(doc(db, "gyms", G, "gamification", "bob"), { totalVisits: 10, currentStreakDays: 3, longestStreakDays: 5 });
    await setDoc(doc(db, "gyms", G, "gamification", "carol"), { totalVisits: 10, currentStreakDays: 3, longestStreakDays: 5 });
    await setDoc(doc(db, "gyms", G, "gamification", "alice"), { totalVisits: 10, currentStreakDays: 3, longestStreakDays: 5 });
  });
}

const as = (uid: string, email = `${uid}@x.com`) => env.authenticatedContext(uid, { email }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-gymli-rules", firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seed(); });

describe("users", () => {
  const newUser = (uid: string, over: Record<string, unknown> = {}) => ({
    uid, gymId: G, role: "user", firstName: "New", lastName: "Member", username: "newbie", email: `${uid}@x.com`, fitnessGoals: [], bio: "",
    usualTrainingTime: "Evenings", leaderboardOptIn: false, buddyOptIn: false, autoPresenceEnabled: false, photoURL: "",
    termsAcceptedAt: serverTimestamp(), createdAt: serverTimestamp(), ...over,
  });

  it("lets a new member create their own doc with role user", async () => {
    await assertSucceeds(setDoc(doc(as("dave"), "users", "dave"), newUser("dave")));
  });
  it("never lets a client choose role admin for an existing gym", async () => {
    await assertFails(setDoc(doc(as("dave"), "users", "dave"), newUser("dave", { role: "admin" })));
  });
  it("rejects signup into a gym that doesn't exist", async () => {
    await assertFails(setDoc(doc(as("dave"), "users", "dave"), newUser("dave", { gymId: "nope" })));
  });
  it("blocks self-promotion and gym hopping", async () => {
    await assertFails(updateDoc(doc(as("alice"), "users", "alice"), { role: "admin" }));
    await assertFails(updateDoc(doc(as("alice"), "users", "alice"), { gymId: OTHER }));
    await assertSucceeds(updateDoc(doc(as("alice"), "users", "alice"), { bio: "hello" }));
  });
  it("lets admins read and promote members of their own gym only", async () => {
    await assertSucceeds(getDoc(doc(as("owner"), "users", "alice")));
    await assertFails(getDoc(doc(as("owner"), "users", "mallory")));
    await assertSucceeds(updateDoc(doc(as("owner"), "users", "alice"), { role: "admin" }));
    await assertFails(updateDoc(doc(as("admin2"), "users", "owner"), { role: "user" }));
  });
  it("hides other members' private docs", async () => {
    await assertFails(getDoc(doc(as("bob"), "users", "alice")));
  });
});

describe("gym onboarding", () => {
  it("creates a gym + owner admin atomically", async () => {
    const db = as("founder");
    const b = writeBatch(db);
    b.set(doc(db, "gyms", "newgym"), { name: "New Gym", ownerUid: "founder", brandPrimary: "200 80% 50%" });
    b.set(doc(db, "users", "founder"), { uid: "founder", gymId: "newgym", role: "admin", firstName: "F", username: "founder", email: "founder@x.com", leaderboardOptIn: false, buddyOptIn: false, termsAcceptedAt: serverTimestamp() });
    b.set(doc(db, "gyms", "newgym", "memberProfiles", "founder"), { uid: "founder", role: "admin", buddyOptIn: false, leaderboardOptIn: false });
    b.set(doc(db, "gyms", "newgym", "usernames", "founder"), { uid: "founder" });
    await assertSucceeds(b.commit());
  });
  it("won't let an existing member become admin of a new gym", async () => {
    const db = as("alice");
    await assertFails(setDoc(doc(db, "gyms", "alicegym"), { name: "Mine", ownerUid: "alice", brandPrimary: "200 80% 50%" }));
  });
  it("only admins update gym settings", async () => {
    const base = { name: "Ironworks", ownerUid: "owner", brandPrimary: "10 80% 50%", thresholdLow: 10, thresholdModerate: 30, thresholdPacked: 60, geofenceRadiusM: 150 };
    await assertSucceeds(setDoc(doc(as("admin2"), "gyms", G), base));
    await assertFails(setDoc(doc(as("alice"), "gyms", G), base));
    await assertFails(setDoc(doc(as("admin2"), "gyms", G), { ...base, ownerUid: "admin2" }));
  });
});

describe("tenant isolation", () => {
  it("members of another gym can't read this gym's data", async () => {
    await assertFails(getDocs(collection(as("mallory"), "gyms", G, "classes")));
    await assertSucceeds(getDocs(collection(as("alice"), "gyms", G, "classes")));
  });
  it("only admins write classes", async () => {
    const c = { name: "Box", day: "Fri", time: "06:00", capacity: 10, durationMin: 60, coach: "A", room: "Ring" };
    await assertFails(setDoc(doc(as("alice"), "gyms", G, "classes", "box"), c));
    await assertSucceeds(setDoc(doc(as("owner"), "gyms", G, "classes", "box"), c));
  });
});

describe("class booking + waitlist", () => {
  const slot = `hiit_2026-09-24`;
  async function book(uid: string, full: boolean) {
    const db = as(uid);
    await runTransaction(db, async (tx) => {
      const sref = doc(db, "gyms", G, "classSlots", slot);
      const s = await tx.get(sref);
      if (!s.exists()) tx.set(sref, { classId: "hiit", date: "2026-09-24", capacity: 1, confirmedCount: 1, waitlistOrder: [] });
      else if (full) tx.update(sref, { waitlistOrder: arrayUnion(uid) });
      else tx.update(sref, { confirmedCount: increment(1) });
      tx.set(doc(db, "gyms", G, "classBookings", `${slot}_${uid}`), { userId: uid, slotId: slot, classId: "hiit", status: full ? "waitlisted" : "confirmed", waitlistPosition: null, date: "2026-09-24", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });
  }
  it("books, waitlists and promotes on cancel", async () => {
    await assertSucceeds(book("alice", false));
    await assertSucceeds(book("bob", true));
    // Over-capacity confirm is rejected.
    await assertFails(updateDoc(doc(as("carol"), "gyms", G, "classSlots", slot), { confirmedCount: 2 }));
    // alice cancels → bob promoted, in one transaction from alice's client.
    const db = as("alice");
    await assertSucceeds(runTransaction(db, async (tx) => {
      tx.update(doc(db, "gyms", G, "classSlots", slot), { waitlistOrder: arrayRemove("bob") });
      tx.update(doc(db, "gyms", G, "classBookings", `${slot}_alice`), { status: "cancelled", updatedAt: serverTimestamp() });
      tx.update(doc(db, "gyms", G, "classBookings", `${slot}_bob`), { status: "confirmed", waitlistPosition: null, updatedAt: serverTimestamp() });
    }));
  });
  it("can't promote someone who is still on the waitlist, or touch other fields", async () => {
    await book("alice", false);
    await book("bob", true);
    await assertFails(updateDoc(doc(as("carol"), "gyms", G, "classBookings", `${slot}_bob`), { status: "confirmed" }));
    await assertFails(updateDoc(doc(as("carol"), "gyms", G, "classBookings", `${slot}_alice`), { status: "cancelled" }));
  });
  it("booking IDs are bound to the booker", async () => {
    await book("alice", false);
    await assertFails(setDoc(doc(as("carol"), "gyms", G, "classBookings", `${slot}_bob`), { userId: "carol", slotId: slot, status: "confirmed" }));
  });
  it("members only see their own bookings; admins see all", async () => {
    await book("alice", false);
    await assertFails(getDoc(doc(as("bob"), "gyms", G, "classBookings", `${slot}_alice`)));
    await assertSucceeds(getDocs(query(collection(as("bob"), "gyms", G, "classBookings"), where("userId", "==", "bob"))));
    await assertSucceeds(getDocs(collection(as("owner"), "gyms", G, "classBookings")));
  });
});

describe("reading deterministic docs before they exist", () => {
  it("own booking / visit / reverse swipe are readable (as not-found), others' aren't", async () => {
    await assertSucceeds(getDoc(doc(as("alice"), "gyms", G, "classBookings", "hiit_2026-09-24_alice")));
    await assertFails(getDoc(doc(as("alice"), "gyms", G, "classBookings", "hiit_2026-09-24_bob")));
    await assertSucceeds(getDoc(doc(as("alice"), "gyms", G, "gymVisits", "alice_2026-09-23")));
    await assertFails(getDoc(doc(as("alice"), "gyms", G, "gymVisits", "bob_2026-09-23")));
    await assertSucceeds(getDoc(doc(as("alice"), "gyms", G, "buddySwipes", "bob_alice")));
    await assertFails(getDoc(doc(as("alice"), "gyms", G, "buddySwipes", "bob_carol")));
    await assertFails(getDoc(doc(as("mallory"), "gyms", G, "gymVisits", "mallory_2026-09-23")));
  });
});

describe("check-ins & gamification", () => {
  it("allows exactly one visit doc per member per day", async () => {
    const db = as("alice");
    await assertSucceeds(setDoc(doc(db, "gyms", G, "gymVisits", "alice_2026-09-23"), { uid: "alice", dateKey: "2026-09-23", source: "manual", createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db, "gyms", G, "gymVisits", "alice_2026-09-23"), { uid: "alice", dateKey: "2026-09-23", source: "manual", createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db, "gyms", G, "gymVisits", "bob_2026-09-23"), { uid: "bob", dateKey: "2026-09-23", source: "manual" }));
  });
  it("bounds gamification updates to +1 visit", async () => {
    const db = as("alice");
    await assertSucceeds(updateDoc(doc(db, "gyms", G, "gamification", "alice"), { totalVisits: 11, currentStreakDays: 4, longestStreakDays: 5 }));
    await assertFails(updateDoc(doc(db, "gyms", G, "gamification", "alice"), { totalVisits: 50, currentStreakDays: 4, longestStreakDays: 5 }));
    await assertFails(updateDoc(doc(as("bob"), "gyms", G, "gamification", "alice"), { totalVisits: 12 }));
  });
  it("rollup increments one at a time", async () => {
    const db = as("alice");
    await assertSucceeds(setDoc(doc(db, "gyms", G, "checkInStats", "2026-09-23"), { dateKey: "2026-09-23", dayOfWeek: 2, total: 1, hours: { "17": 1 } }));
    await assertSucceeds(updateDoc(doc(as("bob"), "gyms", G, "checkInStats", "2026-09-23"), { total: increment(1), "hours.17": increment(1) }));
    await assertFails(updateDoc(doc(db, "gyms", G, "checkInStats", "2026-09-23"), { total: 99 }));
  });
  it("presence is readable by members and writable only by self", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "gyms", G, "userPresence", "alice"), { isActive: true, lastSeen: serverTimestamp(), lastCheckInAt: serverTimestamp(), source: "manual" }));
    await assertFails(setDoc(doc(as("bob"), "gyms", G, "userPresence", "alice"), { isActive: false, lastSeen: serverTimestamp(), lastCheckInAt: null, source: "manual" }));
    await assertSucceeds(getDocs(query(collection(as("bob"), "gyms", G, "userPresence"), where("isActive", "==", true))));
    await assertFails(getDocs(collection(as("mallory"), "gyms", G, "userPresence")));
  });
  it("badges must come from the catalog", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "gyms", G, "userBadges", "alice", "earned", "first_visit"), { earnedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as("alice"), "gyms", G, "userBadges", "alice", "earned", "made_up"), { earnedAt: serverTimestamp() }));
  });
});

describe("Gym Buddy visibility exception", () => {
  it("opted-in members can read each other's stats", async () => {
    await assertSucceeds(getDoc(doc(as("alice"), "gyms", G, "gamification", "bob")));
    await assertSucceeds(getDocs(collection(as("alice"), "gyms", G, "personalRecords", "bob", "records")));
  });
  it("is scoped strictly to buddyOptIn: true", async () => {
    await assertFails(getDoc(doc(as("alice"), "gyms", G, "gamification", "carol"))); // target opted out
    await assertFails(getDoc(doc(as("carol"), "gyms", G, "gamification", "bob"))); // viewer opted out
    await assertFails(getDoc(doc(as("mallory"), "gyms", G, "gamification", "bob"))); // other gym
  });
  it("candidate queries must filter on buddyOptIn", async () => {
    await assertSucceeds(getDocs(query(collection(as("alice"), "gyms", G, "memberProfiles"), where("buddyOptIn", "==", true))));
    await assertFails(getDocs(collection(as("alice"), "gyms", G, "memberProfiles")));
  });
  it("a match requires two real likes", async () => {
    const match = { members: ["alice", "bob"], memberNames: {}, lastMessage: "", lastMessageAt: null, lastSenderId: null, createdAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(as("alice"), "gyms", G, "buddySwipes", "alice_bob"), { fromUserId: "alice", toUserId: "bob", action: "like", createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as("alice"), "gyms", G, "buddyMatches", "alice_bob"), match));
    await assertSucceeds(setDoc(doc(as("bob"), "gyms", G, "buddySwipes", "bob_alice"), { fromUserId: "bob", toUserId: "alice", action: "like", createdAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(as("bob"), "gyms", G, "buddyMatches", "alice_bob"), match));
    await assertSucceeds(addDoc(collection(as("alice"), "gyms", G, "buddyMatches", "alice_bob", "messages"), { senderId: "alice", text: "hi", createdAt: serverTimestamp() }));
    await assertFails(getDocs(collection(as("carol"), "gyms", G, "buddyMatches", "alice_bob", "messages")));
  });
  it("can't swipe on an opted-out member or as someone else", async () => {
    await assertFails(setDoc(doc(as("alice"), "gyms", G, "buddySwipes", "alice_carol"), { fromUserId: "alice", toUserId: "carol", action: "like" }));
    await assertFails(setDoc(doc(as("alice"), "gyms", G, "buddySwipes", "bob_alice"), { fromUserId: "bob", toUserId: "alice", action: "like" }));
  });
});

describe("notices & notifications", () => {
  it("only admins post notices", async () => {
    const n = { title: "Pool closed", body: "Maintenance all weekend.", tag: "FACILITY", authorName: "Front desk", authorUid: "owner", createdAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(as("owner"), "gyms", G, "notices", "n1"), n));
    await assertFails(setDoc(doc(as("alice"), "gyms", G, "notices", "n2"), { ...n, authorUid: "alice" }));
    await assertSucceeds(getDoc(doc(as("alice"), "gyms", G, "notices", "n1")));
  });
  it("same-gym members can notify each other; other gyms can't", async () => {
    const n = { type: "waitlist_promoted", title: "You're in", body: "", link: "/app/classes", readAt: null, createdAt: serverTimestamp() };
    await assertSucceeds(addDoc(collection(as("alice"), "users", "bob", "notifications"), n));
    await assertFails(addDoc(collection(as("mallory"), "users", "bob", "notifications"), n));
    await assertFails(getDocs(collection(as("alice"), "users", "bob", "notifications")));
  });
  it("leaderboard writes require opt-in", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "gyms", G, "leaderboard", "2026-09", "entries", "alice"), { uid: "alice", displayName: "Alice", initials: "A", visits: 3, streak: 2 }));
    await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(ctx.firestore(), "gyms", G, "memberProfiles", "bob"), { leaderboardOptIn: false }); });
    await assertFails(setDoc(doc(as("bob"), "gyms", G, "leaderboard", "2026-09", "entries", "bob"), { uid: "bob", displayName: "Bob", initials: "B", visits: 3, streak: 2 }));
    await assertSucceeds(deleteDoc(doc(as("bob"), "gyms", G, "leaderboard", "2026-09", "entries", "bob")));
  });
});
