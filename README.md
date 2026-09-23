# Gymli 2.0

A white-label member app for independent gyms: check-in (manual and geofenced), a live crowd meter, class and trainer booking with automatic waitlists, streaks, badges, a monthly leaderboard, an AI coach, notices, and Gym Buddy matching with 1:1 chat. Staff get an admin area for analytics, bookings, schedule, notices and gym settings.

**Stack:** Next.js 16 (App Router) · TypeScript · Firebase Auth + Firestore · Tailwind 3 + shadcn-style components on Radix · react-hook-form + zod · recharts · Claude (Anthropic API) for the AI coach · hand-written service worker.

---

## Quick start (local, against emulators)

Requires Node 22 and Java 17+ (for the Firebase emulators).

```bash
npm install
cp .env.example .env.local        # then set the emulator values below
npm run emulators                 # terminal 1 — Auth :9099, Firestore :8080
npm run seed                      # terminal 2 — demo gym "Ironworks", 8 weeks of history
npm run dev                       # http://localhost:3000
```

`.env.local` for emulators:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-gymli.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-gymli
NEXT_PUBLIC_FIREBASE_APP_ID=demo-app
NEXT_PUBLIC_USE_EMULATORS=true
NEXT_PUBLIC_DEFAULT_GYM_ID=demo
NEXT_PUBLIC_DEMO_MODE=true
```

Demo logins (password `password123`): `thandi@demo.gymli.app` (member, 13-day streak — check in to hit the 14-day milestone), `admin@demo.gymli.app` (gym owner/admin). Other members: `naledi@`, `kea@`, `lwazi@`, `ruan@`, `aisha@` … `@demo.gymli.app`.

## Tests — run all of these before calling anything done

| Command | What it proves |
|---|---|
| `npm run lint` · `npm run typecheck` | Static checks (ESLint flat config incl. React-compiler purity rules). |
| `npm test` | Unit tests: streak maths, gym-timezone dates, crowd levels, branding, tenant resolution, badges, forecast, rules-based coach. |
| `npm run test:rules` | **29 security-rules tests** against the Firestore emulator — tenant isolation, role escalation, waitlist promotion, the Gym Buddy visibility exception, etc. |
| `npm run check:sw` | Executes `public/sw.js` in a sandbox (install → activate → fetch → offline fallback) and fails on any transpiler helper like `_async_to_generator`. |
| `npm run e2e` | **Golden path in a real browser** (needs emulators + seed + running app): check-in → streak celebration, booking, waitlist, cross-user waitlist promotion + notification, PR logging, buddy match + chat, AI coach, notices, admin flows, and no horizontal scroll at 390 px. Set `CHROME_PATH` if Chromium isn't auto-detected. |

CI (`.github/workflows/ci.yml`) runs all of them on every PR, the e2e job against a production build.

## Deploying

### 1. Firebase project

Create a project (or reuse one), enable **Authentication → Email/Password** and **Firestore**. Copy the web-app config into your host's environment variables (`NEXT_PUBLIC_FIREBASE_*` in `.env.example`). The config is read from env only — nothing is hardcoded.

### 2. Firestore rules & indexes — from the repo, never the console

`firestore.rules` and `firestore.indexes.json` are the source of truth. Hand-edited console rules drift from the repo and produce "the code is right but the deployed rules are stale" bugs.

- **Automatically:** set the repo variable `FIREBASE_PROJECT_ID` and the secret `FIREBASE_SERVICE_ACCOUNT` (a service-account JSON with the *Firebase Rules Admin* and *Cloud Datastore Index Admin* roles). Every push to `main` deploys both after tests pass.
- **Manually:** `cp .firebaserc.example .firebaserc`, set your project ID, then `npx firebase login && npm run deploy:rules`.

To check what's live: Firebase console → Firestore → Rules shows the deploy timestamp; it should match your last `main` push.

### 3. Host (Vercel / Netlify)

Deploy as a standard Next.js app. The app needs **no** Firebase Admin credentials: server code (tenant branding, manifest, `/api/coach`) talks to Firestore over REST, either for public docs or *with the caller's own ID token*, so security rules apply to it exactly as they do in the browser.

Environment: everything in `.env.example`. For the AI coach set `ANTHROPIC_API_KEY` (server-only). Without it the coach falls back to a rules-based plan built from the same data.

### 4. Tenants (multi-gym)

Each gym is a document `gyms/{gymId}`; all its data lives under that path. A request resolves to a gym by:

1. **Subdomain** — set `NEXT_PUBLIC_ROOT_DOMAIN=gymli.app` and a wildcard DNS/host alias; `ironworks.gymli.app` → gym `ironworks`.
2. **Path entry** — on a single domain, `/g/ironworks` sets a cookie and opens that gym's sign-in.
3. **Default** — `NEXT_PUBLIC_DEFAULT_GYM_ID` (localhost, previews).

A signed-in member's own `users/{uid}.gymId` always wins; if they land on the wrong tenant they're moved to theirs. New gyms self-onboard at **`/start`**: that creates the gym and its owner (as admin) in one atomic batch that the rules verify. Billing is not wired up — gate `/start` (or the `gyms` create rule) before opening it publicly.

Branding is data: the admin picks a colour/logo in **Gym settings**; it's injected as CSS variables server-side (no flash) and live-updated, and `/manifest.webmanifest` + `/icons/*` are generated per tenant so each gym's installed app has its own name, colour and icon.

## Architecture notes

```
src/
  app/                 routes: / (marketing), /login, /signup, /start, /g/[slug], /app/**, /app/admin/**, /api/coach
  components/
    ui/                design-system primitives (button, field, switch, segmented, dialog, …)
    shell/             auth gate, sidebar / mobile tabs, notification bell, geofence auto check-in
    member/ admin/     feature screens
    providers/         auth, gym (tenant), celebrations, toaster
  hooks/               live Firestore subscriptions, shared clock
  lib/
    actions/           every Firestore write (each matches a tested rule)
    server/            REST Firestore client, ID-token verification, tenant resolution
    types.ts paths.ts  data model + the single map of where each collection lives
firestore.rules        security rules (with tests in tests/rules)
public/sw.js           hand-written service worker
```

**Data model** — see `src/lib/types.ts`. Tenant-scoped collections are path-prefixed under `gyms/{gymId}/`: `memberProfiles`, `usernames`, `classes`, `trainers`, `classSlots` (`{classId}_{date}`), `classBookings` (`{slotId}_{uid}`), `trainerBookings`, `userPresence`, `checkIns`, `checkInStats` (hourly rollup per day), `gymVisits` (`{uid}_{date}`), `gamification`, `personalRecords/{uid}/records`, `userBadges/{uid}/earned`, `leaderboard/{YYYY-MM}/entries`, `notices`, `workoutLogs`, `bodyMetrics`, `workoutPlans`, `buddySwipes` (`{from}_{to}`), `buddyMatches` (sorted uids) + `messages`. Private per-user: `users/{uid}`, `users/{uid}/notifications`, `users/{uid}/noticeReads`.

**`memberProfiles` vs `users`** — `users/{uid}` is private (email, role). `memberProfiles/{uid}` is the shareable subset, mirrored on every profile save. The Gym Buddy exception lets a member read another member's streak/visits/PRs/badges **only while both have `buddyOptIn: true`**, and candidate queries must filter on it.

### Client-trust tradeoffs (documented on purpose)

There is no privileged server in the deploy target, so these values are written by members' own clients. Rules bound each write (shape, +1 per write, capacity caps, opt-in checks), but a determined member could inflate **their own** numbers:

- occupancy (`userPresence`), class-slot counters, hourly check-in rollups
- streaks / visit counts, badges, leaderboard entries
- waitlist promotion and notifications are written by whichever member triggers the event (e.g. the one cancelling); rules restrict that cross-user write to exactly the waitlisted→confirmed transition while the promoted uid leaves the slot's waitlist in the same transaction
- the AI-coach rate limit (one plan per 6 h) is enforced by the server reading the member's append-only plan history

Moving any of these to Cloud Functions later means tightening the rules; the data shapes don't change.

### Deliberate decisions (vs. the first build)

- **Multi-tenant from day one** (path-prefixed `gyms/{gymId}`), resolved from subdomain / path, not user choice.
- **Env-only Firebase config**, `firebase.json` + CI-deployed rules, rules tests.
- **Hand-written service worker** (no generated offline fallback), verified in CI by executing it.
- **Hydration-safe state:** theme, sidebar preference, toasts and the clock all go through `useSyncExternalStore` with a server snapshot; nothing reads `window`/`localStorage` during render. The shadcn toast (module-level `memoryState` + `useState`) is replaced by `src/lib/toast.ts`.
- **All profile fields at signup** (4-step onboarding: account → name/username/goals/training time/bio → auto check-in → Gym Buddy + leaderboard + terms).
- **Dark by default with a light mode**, both from the same CSS-variable tokens; the brand colour is the only per-gym variable (plus derived text-safe variants).
- **Accessibility:** labelled fields, errors shown with icon + text and linked via `aria-describedby`, icon buttons have accessible names, skip link, charts have screen-reader tables, `prefers-reduced-motion` drops pop/burst/glow animations.
- **The dashboard shows the latest PR**; the full PR table (add / edit / delete) lives under Progress → Records, per the design handoff.
