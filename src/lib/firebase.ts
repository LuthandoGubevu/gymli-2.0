"use client";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { AUTH_EMULATOR_PORT, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT, firebaseConfig, firebaseConfigured, useEmulators } from "./env";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

function init() {
  if (app) return;
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured. Copy .env.example to .env.local and fill in NEXT_PUBLIC_FIREBASE_* values.");
  }
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  if (useEmulators) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  }
}

export function getFirebaseAuth(): Auth {
  init();
  return auth!;
}

export function getDb(): Firestore {
  init();
  return db!;
}
