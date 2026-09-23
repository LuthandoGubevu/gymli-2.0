// Gymli data model. Everything tenant-scoped lives under gyms/{gymId}/...
// (see firestore.rules). Only `gyms/{gymId}` and `users/{uid}` are top-level.
import type { Timestamp } from "firebase/firestore";

export type Role = "user" | "admin";
export type WeightUnit = "kg" | "lb";
export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export const DAY_KEYS: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type TrainingTime = "Early mornings" | "Mornings" | "Midday" | "Evenings" | "Weekends" | "Varies";
export const TRAINING_TIMES: TrainingTime[] = ["Early mornings", "Mornings", "Midday", "Evenings", "Weekends", "Varies"];

export const FITNESS_GOALS = ["Strength", "Hyrox", "Weight loss", "Consistency", "Mobility", "Boxing", "Muscle gain", "Endurance"] as const;

/** gyms/{gymId} — one per tenant. Public-read so branding works pre-login. */
export interface Gym {
  id: string;
  name: string;
  ownerUid: string;
  address: string;
  timezone: string; // IANA, e.g. "Africa/Johannesburg"
  latitude: number | null;
  longitude: number | null;
  geofenceRadiusM: number;
  thresholdLow: number; // Quiet up to this many members
  thresholdModerate: number; // Moderate up to this
  thresholdPacked: number; // Busy up to this; Packed above. Also the 100% mark on meters.
  brandPrimary: string; // HSL channels, e.g. "45 93% 52%"
  logoUrl: string;
  promoTags: string[];
  generalNotice: string;
  offerExpiry: string | null; // YYYY-MM-DD
  contactEmail: string;
  contactPhone: string;
  openHour: number; // 0-23, for charts
  closeHour: number; // 0-23
  createdAt?: Timestamp;
}

/** users/{uid} — private. Never client-writable: role, gymId (after create). */
export interface UserProfile {
  uid: string;
  gymId: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: Role;
  fitnessGoals: string[];
  bio: string;
  usualTrainingTime: TrainingTime;
  leaderboardOptIn: boolean;
  buddyOptIn: boolean;
  autoPresenceEnabled: boolean;
  termsAcceptedAt: Timestamp | null;
  photoURL: string;
  createdAt: Timestamp;
}

/** gyms/{gymId}/memberProfiles/{uid} — the shareable subset of a user, mirrored on every profile save. */
export interface MemberProfile {
  uid: string;
  firstName: string;
  lastName: string;
  username: string;
  fitnessGoals: string[];
  bio: string;
  usualTrainingTime: TrainingTime;
  buddyOptIn: boolean;
  leaderboardOptIn: boolean;
  photoURL: string;
  role: Role;
  createdAt: Timestamp;
}

export interface GymClass {
  id: string;
  name: string;
  day: DayKey;
  time: string; // "HH:mm"
  durationMin: number;
  capacity: number;
  coach: string;
  room: string;
}

export interface Trainer {
  id: string;
  name: string;
  specialties: string[];
  availability: string;
  bio: string;
  avatarUrl: string;
}

/** gyms/{gymId}/classSlots/{classId}_{YYYY-MM-DD} */
export interface ClassSlot {
  id: string;
  classId: string;
  date: string;
  capacity: number;
  confirmedCount: number;
  waitlistOrder: string[]; // uids, earliest first
}

export type ClassBookingStatus = "confirmed" | "waitlisted" | "cancelled";
/** gyms/{gymId}/classBookings/{slotId}_{uid} — deterministic, so a member can't double-book. */
export interface ClassBooking {
  id: string;
  userId: string;
  userName: string;
  classId: string;
  className: string;
  slotId: string;
  date: string;
  time: string;
  status: ClassBookingStatus;
  waitlistPosition: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TrainerBookingStatus = "pending" | "accepted" | "declined" | "cancelled";
export interface TrainerBooking {
  id: string;
  userId: string;
  userName: string;
  trainerId: string;
  trainerName: string;
  requestedDate: string; // YYYY-MM-DD
  requestedTime: string; // HH:mm
  note: string;
  status: TrainerBookingStatus;
  createdAt: Timestamp;
  decidedAt: Timestamp | null;
}

/** gyms/{gymId}/userPresence/{uid} */
export interface UserPresence {
  isActive: boolean;
  lastSeen: Timestamp;
  lastCheckInAt: Timestamp | null;
  source: CheckInSource;
}

export type CheckInSource = "geo" | "manual";
/** gyms/{gymId}/checkIns/{autoId} */
export interface CheckIn {
  uid: string;
  source: CheckInSource;
  dateKey: string;
  dayOfWeek: number; // 0 = Mon
  hourOfDay: number;
  createdAt: Timestamp;
}

/** gyms/{gymId}/checkInStats/{YYYY-MM-DD} — hourly rollup for busiest-times charts. */
export interface CheckInStats {
  dateKey: string;
  dayOfWeek: number;
  total: number;
  hours: Record<string, number>; // "06" → count
}

/** gyms/{gymId}/gymVisits/{uid}_{YYYY-MM-DD} — source of truth for streaks. */
export interface GymVisit {
  uid: string;
  dateKey: string;
  source: CheckInSource;
  createdAt: Timestamp;
}

/** gyms/{gymId}/gamification/{uid} */
export interface Gamification {
  currentStreakDays: number;
  longestStreakDays: number;
  totalVisits: number;
  visitsThisMonth: number;
  monthKey: string; // YYYY-MM
  lastVisitDate: string | null; // YYYY-MM-DD
  updatedAt?: Timestamp;
}

/** gyms/{gymId}/personalRecords/{uid}/records/{id} — one doc per exercise, best only. */
export interface PersonalRecord {
  id: string;
  exercise: string;
  exerciseKey: string; // lowercased, for de-duping
  value: number;
  unit: WeightUnit;
  date: string; // YYYY-MM-DD
  previousValue: number | null;
  updatedAt?: Timestamp;
}

/** gyms/{gymId}/userBadges/{uid}/earned/{badgeId} */
export interface EarnedBadge {
  id: string;
  earnedAt: Timestamp;
}

/** gyms/{gymId}/leaderboard/{YYYY-MM}/entries/{uid} — only exists for opted-in members. */
export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  initials: string;
  visits: number;
  streak: number;
  updatedAt?: Timestamp;
}

export type NoticeTag = "GENERAL" | "HOURS" | "SCHEDULE" | "NEW" | "FACILITY" | "PROMO";
export const NOTICE_TAGS: NoticeTag[] = ["GENERAL", "HOURS", "SCHEDULE", "NEW", "FACILITY", "PROMO"];
export interface Notice {
  id: string;
  title: string;
  body: string;
  tag: NoticeTag;
  authorName: string;
  authorUid: string;
  createdAt: Timestamp;
}

export type IntegrationSource = "manual" | "apple_health" | "google_fit" | "strava" | "garmin";
export interface WorkoutLog {
  id: string;
  type: string;
  durationMin: number;
  date: string;
  notes: string;
  source: IntegrationSource;
  createdAt: Timestamp;
}
export interface BodyMetric {
  id: string;
  weight: number;
  unit: WeightUnit;
  date: string;
  source: IntegrationSource;
  createdAt: Timestamp;
}

export interface PlanDay {
  day: DayKey;
  focus: string;
  summary: string;
  exercises: { name: string; prescription: string }[];
}
export interface WorkoutPlan {
  id: string;
  weekOf: string; // YYYY-MM-DD (Monday)
  headline: string;
  rationale: string;
  days: PlanDay[];
  generator: "claude" | "rules";
  createdAt: Timestamp;
}

export type NotificationType = "waitlist_promoted" | "buddy_match" | "buddy_message" | "trainer_booking" | "notice";
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  createdAt: Timestamp;
  readAt: Timestamp | null;
}

export type SwipeAction = "like" | "pass";
/** gyms/{gymId}/buddySwipes/{fromUid}_{toUid} */
export interface BuddySwipe {
  fromUserId: string;
  toUserId: string;
  action: SwipeAction;
  createdAt: Timestamp;
}

/** gyms/{gymId}/buddyMatches/{uidA}_{uidB} (sorted) */
export interface BuddyMatch {
  id: string;
  members: string[];
  memberNames: Record<string, string>;
  createdAt: Timestamp;
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  lastSenderId: string | null;
}
export interface BuddyMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
}
