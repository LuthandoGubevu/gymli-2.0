#!/usr/bin/env node
// Golden-path browser test against a running app + seeded emulators.
//   npm run emulators          # terminal 1
//   npm run seed && npm run dev  # terminal 2 (with NEXT_PUBLIC_USE_EMULATORS=true)
//   npm run e2e                # terminal 3   (E2E_BASE_URL defaults to http://localhost:3000)
// Fails on any uncaught page error, not just on failed assertions: several of the first
// build's bugs only ever showed up at runtime in a real browser.
import { chromium } from "playwright-core";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const failures = [];
let step = "";

async function session(name, email, fn, viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport, timezoneId: "Africa/Johannesburg" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => failures.push(`[${name}] page error during "${step}": ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && /permission-denied|Missing or insufficient permissions/i.test(m.text())) failures.push(`[${name}] rules denied during "${step}": ${m.text()}`); });
  const s = async (label, f) => {
    step = label;
    try { await f(); console.log(`  ✓ ${name}: ${label}`); }
    catch (e) { failures.push(`[${name}] ${label}: ${e.message.split("\n")[0]}`); console.log(`  ✗ ${name}: ${label}`); }
  };
  if (email) {
    await s("sign in", async () => {
      await page.goto(`${BASE}/login`);
      await page.fill("#email", email);
      await page.fill("#password", "password123");
      await page.click("button[type=submit]");
      await page.waitForURL(/\/app/, { timeout: 20000 });
      await page.getByRole("heading", { level: 1 }).waitFor();
    });
  }
  await fn(page, s);
  await ctx.close();
}

const dialog = (page) => page.getByRole("dialog");
let waitlisted = null; // { tab, className } — the full class the member joined the waitlist for
const dayTab = (page, n) => page.locator("[aria-label=Day] [role=tab]").nth(n);

console.log(`E2E against ${BASE}`);

await session("visitor", null, async (page, s) => {
  await s("landing renders", async () => { await page.goto(BASE); await page.getByText("Everything a member app needs").waitFor(); });
  await s("app redirects to login", async () => { await page.goto(`${BASE}/app`); await page.waitForURL(/\/login/); });
  await s("manifest is per-tenant", async () => {
    const m = await (await page.request.get(`${BASE}/manifest.webmanifest`)).json();
    if (!m.name || !m.icons?.length) throw new Error("manifest missing name/icons");
  });
});

await session("member", "thandi@demo.gymli.app", async (page, s) => {
  await s("check in → streak milestone", async () => {
    await page.getByRole("button", { name: "Check in" }).first().click();
    await dialog(page).getByText("Streak milestone").waitFor();
    await dialog(page).getByRole("button", { name: "Keep it going" }).click();
    await page.getByText("Checked in ·").waitFor();
  });
  await s("book a class with spots", async () => {
    await page.goto(`${BASE}/app/classes`);
    for (let t = 0; t < 7; t++) {
      await dayTab(page, t).click();
      if (await page.locator("button[aria-label^='Book ']").count()) break;
    }
    await page.locator("button[aria-label^='Book ']").first().click();
    await dialog(page).getByText("Class booked").waitFor();
    await dialog(page).getByRole("button", { name: "Done" }).click();
  });
  await s("join a full class's waitlist", async () => {
    for (let t = 0; t < 7 && !waitlisted; t++) {
      await dayTab(page, t).click();
      const btn = page.locator("button[aria-label$='Join waitlist']").first();
      if (await btn.count()) waitlisted = { tab: t, className: (await btn.getAttribute("aria-label")).replace(/ is full\. Join waitlist$/, "") };
    }
    if (!waitlisted) throw new Error("no full class in the next 7 days");
    await page.locator("button[aria-label$='Join waitlist']").first().click();
    await page.getByText(/on the waitlist/).first().waitFor();
    await page.locator("button[aria-label*='Waitlist position']").first().waitFor();
  });
  await s("PR must beat the best, then celebrates", async () => {
    await page.goto(`${BASE}/app/records`);
    await page.getByRole("button", { name: "Log a PR" }).click();
    await page.fill("#pr-exercise", "Back Squat");
    await page.fill("#pr-value", "100");
    await page.getByRole("button", { name: "Save record" }).click();
    await page.getByText(/a PR has to beat it/).waitFor();
    await page.fill("#pr-value", "150");
    await page.getByRole("button", { name: "Save record" }).click();
    await dialog(page).getByText("New personal record").waitFor();
  });
  await s("Gym Buddy mutual like → match → chat", async () => {
    await page.keyboard.press("Escape");
    await page.goto(`${BASE}/app/buddy`);
    for (let i = 0; i < 4; i++) {
      await page.locator("button[aria-label^='Like ']").click();
      const matched = await dialog(page).getByText("It's a match!").waitFor({ timeout: 4000 }).then(() => true).catch(() => false);
      if (matched) break;
    }
    await dialog(page).getByRole("button", { name: /Say hi to/ }).click();
    await page.fill("#chat-input", "Sled pushes Thursday?");
    await page.getByRole("button", { name: "Send" }).click();
    await page.getByText("Sled pushes Thursday?").waitFor();
  });
  await s("AI coach builds a week", async () => {
    await page.goto(`${BASE}/app/coach`);
    await page.getByRole("button", { name: "Build my week" }).click();
    await page.getByRole("button", { name: "Regenerate" }).waitFor({ timeout: 60000 });
  });
  await s("mark notices read", async () => {
    await page.goto(`${BASE}/app/notices`);
    await page.getByRole("button", { name: "Mark all read" }).click();
    await page.getByRole("button", { name: "Mark all read" }).waitFor({ state: "detached" });
  });
});

await session("promoter", "aisha@demo.gymli.app", async (page, s) => {
  await s("cancelling a full class promotes the waitlist", async () => {
    await page.goto(`${BASE}/app/classes`);
    if (!waitlisted) throw new Error("member step didn't join a waitlist");
    await dayTab(page, waitlisted.tab).click();
    await page.locator(`button[aria-label^='Booked for ${waitlisted.className}']`).click();
    await page.getByText(/next on the waitlist is in/).waitFor();
  });
});

await session("promoted", "naledi@demo.gymli.app", async (page, s) => {
  await s("promoted member is notified", async () => {
    await page.getByRole("button", { name: /Notifications, \d+ unread/ }).first().click();
    await page.getByText(`You're in — ${waitlisted?.className}`).waitFor();
  });
});

await session("admin", "admin@demo.gymli.app", async (page, s) => {
  await s("overview", async () => { await page.goto(`${BASE}/app/admin`); await page.getByText("Today at the gym").waitFor(); });
  await s("post a notice", async () => {
    await page.goto(`${BASE}/app/admin/notices`);
    await page.fill("#n-title", "E2E notice title");
    await page.fill("#n-body", "Posted by the end-to-end test run.");
    await page.getByRole("button", { name: "Post to all members" }).click();
    await page.getByRole("heading", { name: "E2E notice title" }).waitFor();
  });
  await s("accept a trainer request", async () => {
    await page.goto(`${BASE}/app/admin/trainer-requests`);
    await page.getByRole("button", { name: "Accept" }).first().click();
    await page.getByText(/has been notified/).waitFor();
  });
  await s("add a class", async () => {
    await page.goto(`${BASE}/app/admin/classes`);
    await page.getByRole("button", { name: "Add class" }).click();
    await page.fill("#c-name", "E2E Class");
    await page.getByRole("button", { name: "Save class" }).click();
    await page.getByText("E2E Class").first().waitFor();
  });
});

await session("super", "lgubevu@gmail.com", async (page, s) => {
  await s("platform console lists gyms", async () => { await page.goto(`${BASE}/super`); await page.getByText("All gyms").waitFor(); await page.getByText("Ironworks").first().waitFor(); });
  await s("create a gym", async () => {
    await page.getByRole("button", { name: "New gym" }).click();
    await page.fill("#ng-name", "E2E Test Gym");
    await page.getByRole("button", { name: "Create gym" }).click();
    await page.getByText("E2E Test Gym").first().waitFor();
  });
  await s("suspend and reactivate it", async () => {
    page.once("dialog", (d) => d.accept());
    const row = page.locator("li", { hasText: "E2E Test Gym" });
    await row.getByRole("button", { name: "Suspend" }).click();
    await row.getByText("Suspended", { exact: true }).waitFor();
    await row.getByRole("button", { name: "Reactivate" }).click();
    await row.getByText("Active", { exact: true }).waitFor();
  });
  await s("open it as admin", async () => {
    await page.locator("li", { hasText: "E2E Test Gym" }).getByRole("button", { name: "Open as admin" }).click();
    await page.waitForURL(/\/app\/admin/, { timeout: 20000 });
    await page.getByText("Today at the gym").waitFor();
    await page.goto(`${BASE}/app/admin/settings`);
    await page.getByRole("heading", { name: "E2E Test Gym" }).waitFor();
  });
  await s("switch back to Ironworks", async () => {
    await page.goto(`${BASE}/super`);
    await page.locator("li", { hasText: "Ironworks" }).getByRole("button", { name: "Open as admin" }).click();
    await page.waitForURL(/\/app\/admin/, { timeout: 20000 });
    await page.getByRole("heading", { name: "Today at the gym" }).waitFor();
  });
});

await session("intruder", "thandi@demo.gymli.app", async (page, s) => {
  await s("regular members can't use the platform console", async () => { await page.goto(`${BASE}/super`); await page.getByText(/isn.t a platform account/).waitFor(); });
});

await session("mobile", "thandi@demo.gymli.app", async (page, s) => {
  for (const path of ["/app", "/app/crowd", "/app/classes", "/app/records", "/app/buddy", "/app/notices"]) {
    await s(`no horizontal scroll on ${path}`, async () => {
      await page.goto(`${BASE}${path}`);
      await page.getByRole("heading", { level: 1 }).first().waitFor();
      await page.waitForTimeout(800);
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      if (w > 390) throw new Error(`scrollWidth ${w}px > 390px`);
    });
  }
}, { width: 390, height: 844 });

await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n` + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log("\nAll golden-path checks passed.");
