#!/usr/bin/env node
// Seeds the LOCAL EMULATORS with a demo gym. Refuses to run against a real project.
//   npm run emulators   (in another terminal)
//   npm run seed
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
const projectId = process.env.SEED_PROJECT_ID || "demo-gymli";
if (!projectId.startsWith("demo-")) {
  console.error("Refusing to seed a non-demo project. Seeding is for emulators only.");
  process.exit(1);
}

initializeApp({ projectId });
const db = getFirestore();
const auth = getAuth();
const G = process.env.SEED_GYM_ID || "demo";
const TZ = "Africa/Johannesburg";
const PASSWORD = "password123";

// ---------- date helpers (gym timezone) ----------
const pad = (n) => String(n).padStart(2, "0");
function parts(d) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { key: `${p.year}-${p.month}-${p.day}`, hour: +p.hour % 24, weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday) };
}
function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
const weekdayOf = (key) => { const [y, m, d] = key.split("-").map(Number); return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; };
const now = new Date();
const today = parts(now).key;
const nowHour = parts(now).hour;
const monthKey = today.slice(0, 7);

// Demand curve from the design prototype: weekday double peak, weekend late-morning.
function curve(d, h) {
  const g = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
  let v = d >= 5 ? 0.85 * g(h, 9.5, 1.6) + 0.35 * g(h, 15, 2) : 0.7 * g(h, 6.3, 0.9) + 0.32 * g(h, 12.5, 1.2) + 1.0 * g(h, 17.8, 1.3);
  if (d === 4) v *= 0.85;
  v += 0.05 * Math.sin(d * 7.3 + h * 2.1);
  return Math.max(0.04, Math.min(1, v));
}

async function wipe() {
  const collections = await db.listCollections();
  for (const c of collections) await db.recursiveDelete(c);
  const { users } = await auth.listUsers(1000);
  if (users.length) await auth.deleteUsers(users.map((u) => u.uid));
}

async function makeUser({ email, firstName, lastName, username, role = "user", goals = ["Strength"], bio = "", time = "Evenings", buddy = false, lb = true, auto = false, createdDaysAgo = 120 }) {
  const u = await auth.createUser({ email, password: PASSWORD, displayName: `${firstName} ${lastName}` });
  const createdAt = Timestamp.fromDate(new Date(Date.now() - createdDaysAgo * 86400000));
  const shared = { firstName, lastName, username, fitnessGoals: goals, bio, usualTrainingTime: time, buddyOptIn: buddy, leaderboardOptIn: lb, photoURL: "", role };
  await db.doc(`users/${u.uid}`).set({ ...shared, uid: u.uid, gymId: G, email, autoPresenceEnabled: auto, termsAcceptedAt: createdAt, createdAt });
  await db.doc(`gyms/${G}/memberProfiles/${u.uid}`).set({ ...shared, uid: u.uid, createdAt });
  await db.doc(`gyms/${G}/usernames/${username}`).set({ uid: u.uid });
  return u.uid;
}

async function main() {
  console.log(`Seeding emulator project ${projectId}, gym "${G}" (today ${today} ${TZ})`);
  await wipe();

  const ownerUid = "pending";
  await db.doc(`gyms/${G}`).set({
    name: "Ironworks", ownerUid, address: "14 Rivonia Rd, Sandton, Johannesburg", timezone: TZ,
    latitude: -26.1076, longitude: 28.0567, geofenceRadiusM: 100,
    thresholdLow: 20, thresholdModerate: 50, thresholdPacked: 80,
    brandPrimary: "45 93% 52%", logoUrl: "", promoTags: ["Heritage Day hours", "Bring a friend free"],
    generalNotice: "", offerExpiry: null, contactEmail: "frontdesk@ironworks.example", contactPhone: "+27 11 555 0100",
    openHour: 5, closeHour: 21, createdAt: FieldValue.serverTimestamp(),
  });

  const admin = await makeUser({ email: "admin@demo.gymli.app", firstName: "Front", lastName: "Desk", username: "frontdesk", role: "admin", lb: false, createdDaysAgo: 300 });
  await db.doc(`gyms/${G}`).update({ ownerUid: admin });
  const thandi = await makeUser({ email: "thandi@demo.gymli.app", firstName: "Thandi", lastName: "Mokoena", username: "thandi", goals: ["Strength", "Consistency"], bio: "Chasing a 150 kg squat before December.", time: "Evenings", buddy: true, lb: true, createdDaysAgo: 260 });

  const buddies = [
    { firstName: "Lwazi", lastName: "Dube", username: "lwazi", goals: ["Strength"], time: "Early mornings", bio: "Looking for a spotter on heavy bench days. Happy to share programming.", streak: 9, visits: 64, month: 17, pr: ["Deadlift", 210], likesThandi: false },
    { firstName: "Naledi", lastName: "Khumalo", username: "naledi", goals: ["Hyrox", "Endurance"], time: "Evenings", bio: "Need someone to push the sled with. Engine is good, legs need work.", streak: 15, visits: 102, month: 15, pr: ["Back Squat", 110], likesThandi: true },
    { firstName: "Ruan", lastName: "van Wyk", username: "ruan", goals: ["Consistency", "Mobility"], time: "Weekends", bio: "Easy-going and consistent. Want accountability more than intensity.", streak: 4, visits: 23, month: 12, pr: ["Bench Press", 85], likesThandi: false },
    { firstName: "Kea", lastName: "Molefe", username: "kea", goals: ["Strength", "Boxing"], time: "Evenings", bio: "Boxing twice a week, lifting the rest. Always keen for a partner.", streak: 17, visits: 140, month: 19, pr: ["Front Squat", 95], likesThandi: true, matched: true },
  ];
  const buddyIds = {};
  for (const b of buddies) {
    const uid = await makeUser({ email: `${b.username}@demo.gymli.app`, ...b, buddy: true });
    buddyIds[b.username] = uid;
    await db.doc(`gyms/${G}/gamification/${uid}`).set({ currentStreakDays: b.streak, longestStreakDays: b.streak + 6, totalVisits: b.visits, visitsThisMonth: b.month, monthKey, lastVisitDate: addDays(today, -1), updatedAt: FieldValue.serverTimestamp() });
    await db.collection(`gyms/${G}/personalRecords/${uid}/records`).add({ exercise: b.pr[0], exerciseKey: b.pr[0].toLowerCase(), value: b.pr[1], unit: "kg", date: addDays(today, -12), previousValue: b.pr[1] - 5, updatedAt: FieldValue.serverTimestamp() });
    for (const id of ["first_visit", "visits_5", "visits_25", "streak_7", "pr_setter"].slice(0, b.visits > 50 ? 5 : 3)) {
      await db.doc(`gyms/${G}/userBadges/${uid}/earned/${id}`).set({ earnedAt: Timestamp.fromDate(new Date(Date.now() - 90 * 86400000)) });
    }
    await db.doc(`gyms/${G}/leaderboard/${monthKey}/entries/${uid}`).set({ uid, displayName: `${b.firstName} ${b.lastName}`, initials: (b.firstName[0] + b.lastName[0]).toUpperCase(), visits: b.month, streak: b.streak, updatedAt: FieldValue.serverTimestamp() });
    if (b.likesThandi) await db.doc(`gyms/${G}/buddySwipes/${uid}_${thandi}`).set({ fromUserId: uid, toUserId: thandi, action: "like", createdAt: FieldValue.serverTimestamp() });
  }

  // Existing match with Kea, with a short chat.
  const kea = buddyIds.kea;
  await db.doc(`gyms/${G}/buddySwipes/${thandi}_${kea}`).set({ fromUserId: thandi, toUserId: kea, action: "like", createdAt: FieldValue.serverTimestamp() });
  const matchId = [thandi, kea].sort().join("_");
  const t0 = Date.now() - 26 * 3600000;
  await db.doc(`gyms/${G}/buddyMatches/${matchId}`).set({ members: [thandi, kea].sort(), memberNames: { [thandi]: "Thandi Mokoena", [kea]: "Kea Molefe" }, createdAt: Timestamp.fromDate(new Date(t0 - 86400000)), lastMessage: "Same time Thursday? I'll bring chalk.", lastMessageAt: Timestamp.fromDate(new Date(t0 + 120000)), lastSenderId: kea });
  await db.collection(`gyms/${G}/buddyMatches/${matchId}/messages`).add({ senderId: thandi, text: "That was a good session! Squats again this week?", createdAt: Timestamp.fromDate(new Date(t0)) });
  await db.collection(`gyms/${G}/buddyMatches/${matchId}/messages`).add({ senderId: kea, text: "Same time Thursday? I'll bring chalk.", createdAt: Timestamp.fromDate(new Date(t0 + 120000)) });

  // Leaderboard filler + a crowd of members currently "in".
  const others = [["Aisha", "Patel", 11, 6], ["Bongani", "Zulu", 9, 3], ["Megan", "Pillay", 8, 2], ["Sipho", "Ndlovu", 6, 1], ["Lerato", "Mahlangu", 5, 4]];
  const crowdIds = [];
  for (const [f, l, v, s] of others) {
    const uid = await makeUser({ email: `${f.toLowerCase()}@demo.gymli.app`, firstName: f, lastName: l, username: f.toLowerCase(), createdDaysAgo: 30 + v });
    crowdIds.push(uid);
    await db.doc(`gyms/${G}/leaderboard/${monthKey}/entries/${uid}`).set({ uid, displayName: `${f} ${l}`, initials: (f[0] + l[0]).toUpperCase(), visits: v, streak: s, updatedAt: FieldValue.serverTimestamp() });
  }
  // Recent signups for the admin "new this week" stat.
  for (let i = 0; i < 6; i++) {
    const uid = await makeUser({ email: `new${i}@demo.gymli.app`, firstName: ["Zanele", "Pieter", "Nomsa", "Tariq", "Lindiwe", "Johan"][i], lastName: "Member", username: `newmember${i}`, lb: false, createdDaysAgo: i });
    crowdIds.push(uid);
  }
  const presenceBatch = db.batch();
  const inNow = 38;
  for (let i = 0; i < inNow; i++) {
    const id = crowdIds[i] ?? `anon-${i}`;
    presenceBatch.set(db.doc(`gyms/${G}/userPresence/${id}`), { isActive: true, lastSeen: Timestamp.now(), lastCheckInAt: Timestamp.fromDate(new Date(Date.now() - (i % 9) * 600000)), source: "manual" });
  }
  await presenceBatch.commit();

  // Thandi: 13-day streak ending yesterday, so checking in today makes it 14 (a milestone).
  await db.doc(`gyms/${G}/gamification/${thandi}`).set({ currentStreakDays: 13, longestStreakDays: 21, totalVisits: 87, visitsThisMonth: Math.min(14, Number(today.slice(8)) - 1) || 0, monthKey, lastVisitDate: addDays(today, -1), updatedAt: FieldValue.serverTimestamp() });
  for (let i = 1; i <= 13; i++) {
    const k = addDays(today, -i);
    await db.doc(`gyms/${G}/gymVisits/${thandi}_${k}`).set({ uid: thandi, dateKey: k, source: "manual", createdAt: Timestamp.fromDate(new Date(Date.now() - i * 86400000)) });
  }
  await db.doc(`gyms/${G}/leaderboard/${monthKey}/entries/${thandi}`).set({ uid: thandi, displayName: "Thandi Mokoena", initials: "TM", visits: Math.min(14, Number(today.slice(8)) - 1) || 0, streak: 13, updatedAt: FieldValue.serverTimestamp() });
  const prs = [["Back Squat", 140, -5, 135], ["Bench Press", 92.5, -13, 90], ["Deadlift", 180, -25, 172.5], ["Overhead Press", 57.5, -40, null]];
  for (const [ex, v, d, prev] of prs) {
    await db.collection(`gyms/${G}/personalRecords/${thandi}/records`).add({ exercise: ex, exerciseKey: ex.toLowerCase(), value: v, unit: "kg", date: addDays(today, d), previousValue: prev, updatedAt: FieldValue.serverTimestamp() });
  }
  for (const [id, days] of [["first_visit", 250], ["visits_5", 240], ["visits_25", 160], ["streak_7", 190], ["pr_setter", 190]]) {
    await db.doc(`gyms/${G}/userBadges/${thandi}/earned/${id}`).set({ earnedAt: Timestamp.fromDate(new Date(Date.now() - days * 86400000)) });
  }

  // 8 weeks of hourly check-in rollups (+ today up to now).
  for (let i = 56; i >= 0; i--) {
    const k = addDays(today, -i);
    const wd = weekdayOf(k);
    const hours = {};
    let total = 0;
    for (let h = 5; h <= 21; h++) {
      if (i === 0 && h > nowHour) break;
      const n = Math.round(curve(wd, h) * 28 * (0.85 + 0.3 * Math.abs(Math.sin(i * 1.7 + h))));
      if (n > 0) { hours[pad(h)] = n; total += n; }
    }
    await db.doc(`gyms/${G}/checkInStats/${k}`).set({ dateKey: k, dayOfWeek: wd, total, hours });
  }

  // Classes & trainers.
  const classes = [
    ["Spinning", "Mon", "06:00", 15, "Marco Silva", 45, "Studio B"], ["HIIT", "Mon", "18:00", 12, "Sipho Nkosi", 45, "Studio A"],
    ["Body Con", "Tue", "07:00", 20, "Marco Silva", 50, "Studio A"], ["Box", "Tue", "17:30", 10, "Aisha Patel", 60, "The Ring"],
    ["Step", "Wed", "06:00", 15, "Aisha Patel", 45, "Studio A"], ["Spinning", "Wed", "18:00", 15, "Marco Silva", 45, "Studio B"],
    ["HIIT", "Thu", "07:00", 12, "Sipho Nkosi", 45, "Studio A"], ["Small Group PT", "Thu", "18:00", 6, "Sipho Nkosi", 60, "Main floor"],
    ["Box", "Fri", "06:00", 10, "Aisha Patel", 60, "The Ring"], ["Only for the Brave", "Fri", "17:00", 8, "Sipho Nkosi", 40, "Main floor"],
    ["Yoga Flow", "Sat", "09:00", 18, "Lerato Mahlangu", 60, "Studio A"], ["Hyrox Sim", "Sat", "10:30", 12, "Sipho Nkosi", 75, "Main floor"],
  ];
  const classIds = {};
  for (const [name, day, time, capacity, coach, durationMin, room] of classes) {
    const ref = await db.collection(`gyms/${G}/classes`).add({ name, day, time, capacity, coach, durationMin, room });
    classIds[`${name}-${day}`] = { id: ref.id, name, day, time, capacity };
  }
  // Fill some upcoming slots so the schedule looks alive.
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const pool = [...crowdIds, ...Object.values(buddyIds)];
  for (let i = 0; i <= 7; i++) {
    const k = addDays(today, i);
    const day = DAYS[weekdayOf(k)];
    for (const c of Object.values(classIds).filter((c) => c.day === day)) {
      const slotId = `${c.id}_${k}`;
      const full = c.name === "HIIT" || c.name === "Only for the Brave";
      const count = full ? c.capacity : Math.min(c.capacity - 1, Math.round(c.capacity * (0.3 + ((i * 7 + c.capacity) % 5) / 10)));
      const confirmed = [];
      for (let j = 0; j < count; j++) confirmed.push(pool[j % pool.length] + (j >= pool.length ? `-x${j}` : ""));
      const waitlist = full ? pool.slice(count % pool.length, (count % pool.length) + 2).filter((u) => !confirmed.includes(u)) : [];
      await db.doc(`gyms/${G}/classSlots/${slotId}`).set({ classId: c.id, date: k, capacity: c.capacity, confirmedCount: count, waitlistOrder: waitlist });
      for (const uid of confirmed.filter((u) => !u.includes("-x"))) {
        await db.doc(`gyms/${G}/classBookings/${slotId}_${uid}`).set({ userId: uid, userName: "Member", classId: c.id, className: c.name, slotId, date: k, time: c.time, status: "confirmed", waitlistPosition: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      }
      for (const [pos, uid] of waitlist.entries()) {
        await db.doc(`gyms/${G}/classBookings/${slotId}_${uid}`).set({ userId: uid, userName: "Member", classId: c.id, className: c.name, slotId, date: k, time: c.time, status: "waitlisted", waitlistPosition: pos + 1, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      }
    }
  }

  const trainers = [
    ["Sipho Nkosi", ["Strength", "Hyrox", "Conditioning"], "Mon–Thu, 06:00–10:00 & 16:00–19:00", "Ex-rugby conditioning coach. Loves a sled push."],
    ["Aisha Patel", ["Boxing", "Weight loss"], "Tue, Fri, 06:00–12:00", "Amateur boxing champion turned coach."],
    ["Marco Silva", ["Mobility", "Cycling", "Rehab"], "Mon, Wed, Sat, 07:00–13:00", "Physio background. Your knees will thank you."],
  ];
  for (const [name, specialties, availability, bio] of trainers) {
    await db.collection(`gyms/${G}/trainers`).add({ name, specialties, availability, bio, avatarUrl: "" });
  }

  const notices = [
    ["HOURS", "Public holiday hours", "On the next public holiday we open 08:00–13:00. The 07:00 HIIT moves to 08:30.", "Front desk", 2],
    ["SCHEDULE", "Spinning moves to Studio B", "From tonight, all Spinning classes run in Studio B while the new bikes are fitted.", "Marco Silva", 26],
    ["NEW", "“Only for the Brave” is back on Fridays", "40 minutes, 8 spots, no mercy. 17:00 every Friday with Sipho.", "Sipho Nkosi", 72],
    ["FACILITY", "Aircon service on Saturday", "The main floor may run warmer 10:00–12:00 while units are serviced.", "Front desk", 130],
  ];
  for (const [tag, title, body, authorName, hoursAgo] of notices) {
    await db.collection(`gyms/${G}/notices`).add({ tag, title, body, authorName, authorUid: admin, createdAt: Timestamp.fromDate(new Date(Date.now() - hoursAgo * 3600000)) });
  }
  const noticeSnap = await db.collection(`gyms/${G}/notices`).get();
  for (const d of noticeSnap.docs) if (d.data().tag === "FACILITY" || d.data().tag === "NEW") await db.doc(`users/${thandi}/noticeReads/${d.id}`).set({ readAt: Timestamp.now() });

  // A pending trainer request for the admin queue.
  const trainerSnap = await db.collection(`gyms/${G}/trainers`).limit(1).get();
  await db.collection(`gyms/${G}/trainerBookings`).add({ userId: buddyIds.lwazi, userName: "Lwazi Dube", trainerId: trainerSnap.docs[0].id, trainerName: trainerSnap.docs[0].data().name, requestedDate: addDays(today, 2), requestedTime: "07:00", note: "Want a technique check on my deadlift.", status: "pending", createdAt: FieldValue.serverTimestamp(), decidedAt: null });

  console.log(`Done. Sign in with thandi@demo.gymli.app or admin@demo.gymli.app / ${PASSWORD}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
