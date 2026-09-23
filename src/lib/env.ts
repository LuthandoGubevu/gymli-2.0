// Single place that reads public env. NEXT_PUBLIC_* values are inlined at build time,
// so they must be referenced literally (no dynamic process.env[key] lookups).
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";
export const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").toLowerCase();
export const defaultGymId = process.env.NEXT_PUBLIC_DEFAULT_GYM_ID || "demo";
export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const EMULATOR_HOST = "127.0.0.1";
export const FIRESTORE_EMULATOR_PORT = 8080;
export const AUTH_EMULATOR_PORT = 9099;
