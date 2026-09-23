/* Gymli service worker — hand-written on purpose.
 *
 * The first build used a plugin-generated worker whose "offline fallback" compiled to
 * code calling an undefined `_async_to_generator` helper, silently breaking every
 * intercepted fetch for installed users. This file is plain ES2017 with no build step,
 * no imports and no helpers, and `npm run check:sw` executes it in a sandbox in CI.
 *
 * Strategy (deliberately small):
 *   - Navigations: network first; if the network fails, show the cached /offline page.
 *   - Hashed build assets (/_next/static/*), icons and images: cache first.
 *   - Everything else (API routes, Firestore/Auth, cross-origin): not intercepted at all.
 */
const VERSION = "gymli-v1";
const STATIC_CACHE = VERSION + "-static";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/192"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isCacheFirst(url) {
  return url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|jpg|jpeg|webp|svg|woff2?)$/.test(url.pathname);
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch (err) {
    const cache = await caches.open(STATIC_CACHE);
    const offline = await cache.match(OFFLINE_URL);
    return offline || new Response("You're offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response && response.ok && response.type === "basic") cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Firestore, Auth, fonts CDN: never touched
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
  } else if (isCacheFirst(url)) {
    event.respondWith(cacheFirst(request));
  }
});
