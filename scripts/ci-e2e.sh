#!/usr/bin/env bash
# Runs inside `firebase emulators:exec` in CI: seed → production build → start → golden path.
set -euo pipefail
node scripts/seed-emulator.mjs
npx next build
npx next start -p 3000 > next.log 2>&1 &
for i in $(seq 1 60); do curl -sf http://localhost:3000/login > /dev/null && break; sleep 1; done
node scripts/e2e.mjs || { tail -50 next.log; exit 1; }
