#!/usr/bin/env node
// Guards against the first build's service-worker bug: it referenced a helper
// (_async_to_generator) that was never defined, so every intercepted fetch threw.
// 1) syntax check, 2) grep for known transpiler helpers / imports,
// 3) actually execute the worker in a sandbox and drive install/activate/fetch.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const path = process.argv[2] || "public/sw.js";
const src = readFileSync(path, "utf8");
const fail = (m) => { console.error(`✗ ${path}: ${m}`); process.exit(1); };

try { new vm.Script(src, { filename: path }); } catch (e) { fail(`syntax error — ${e.message}`); }

const HELPERS = ["_async_to_generator", "_asyncToGenerator", "asyncGeneratorStep", "_regeneratorRuntime", "regeneratorRuntime", "__awaiter", "__generator", "_ts_generator", "_object_spread", "_define_property", "importScripts(", "require("];
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
for (const h of HELPERS) if (code.includes(h)) fail(`references build helper "${h}" — the worker must be self-contained`);
if (/^\s*(import|export)\s/m.test(code)) fail("uses ES module syntax; classic workers can't");

const listeners = {};
const store = new Map();
const cache = { addAll: async (urls) => urls.forEach((u) => store.set(u, new Response("cached " + u))), match: async (r) => store.get(typeof r === "string" ? r : new URL(r.url).pathname), put: async () => {} };
const sandbox = {
  self: { addEventListener: (t, fn) => { listeners[t] = fn; }, skipWaiting: async () => {}, clients: { claim: async () => {} }, location: new URL("https://gym.example") },
  caches: { open: async () => cache, keys: async () => ["old-cache"], delete: async () => true },
  fetch: async (req) => { if (String(req.url ?? req).includes("offline-sim")) throw new TypeError("Failed to fetch"); return new Response("network"); },
  URL, Response, Request, Promise, console,
};
vm.createContext(sandbox);
try { vm.runInContext(src, sandbox, { filename: path }); } catch (e) { fail(`throws at load — ${e.message}`); }
for (const t of ["install", "activate", "fetch"]) if (!listeners[t]) fail(`no ${t} listener`);

const run = async () => {
  const waits = [];
  listeners.install({ waitUntil: (p) => waits.push(p) });
  listeners.activate({ waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  const drive = async (url, mode) => {
    let responded = null;
    const request = { url, method: "GET", mode };
    listeners.fetch({ request, respondWith: (p) => { responded = p; } });
    return responded ? await responded : "passthrough";
  };
  const nav = await drive("https://gym.example/app", "navigate");
  if (!(nav instanceof Response)) fail("navigation didn't produce a Response");
  const off = await drive("https://gym.example/offline-sim", "navigate");
  if (!(off instanceof Response) || !(await off.text()).includes("/offline")) fail("offline fallback not served for a failed navigation");
  const asset = await drive("https://gym.example/_next/static/chunks/a.js", "no-cors");
  if (!(asset instanceof Response)) fail("static asset not handled");
  if ((await drive("https://firestore.googleapis.com/x", "cors")) !== "passthrough") fail("intercepts cross-origin (Firestore) requests");
  if ((await drive("https://gym.example/api/coach", "cors")) !== "passthrough") fail("intercepts /api requests");
  console.log(`✓ ${path}: self-contained, install/activate/fetch run cleanly, offline fallback works`);
};
run().catch((e) => fail(`handler threw — ${e.stack || e.message}`));
