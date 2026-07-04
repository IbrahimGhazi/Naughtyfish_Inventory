/*
 * NaughtyFish service worker — installable PWA + offline resilience.
 *
 * Design notes (this is a FINANCIAL ledger, so correctness > aggressive caching):
 *   - App shell + hashed static assets are cached so the app boots with no signal.
 *   - Page navigations use NETWORK-FIRST: when online we always fetch live data
 *     (never risk showing a stale balance); the cache is only a fallback when the
 *     network genuinely fails. Then we fall back to /offline.
 *   - Only same-origin GET is ever cached. API calls, RSC data fetches, and any
 *     mutation always go straight to the network.
 *   - Redirects are never cached (avoids serving a stale auth redirect offline).
 *   - CLEAR_PAGES lets the app purge cached authenticated pages on logout.
 *
 * Bump VERSION to invalidate every cache on the next activation.
 */
const VERSION = "nf-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;

const PRECACHE = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data === "CLEAR_PAGES") caches.delete(PAGE_CACHE);
});

function isHashedAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

/** Only cache clean, final, same-origin 200s — never redirects or errors. */
function isCacheableResponse(res) {
  return res && res.status === 200 && res.type === "basic" && !res.redirected;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Hashed, immutable build assets → cache-first (safe: content-addressed).
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (isCacheableResponse(res)) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Full-document navigations → network-first, cache fallback, then /offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (isCacheableResponse(res)) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((cached) => cached || caches.match("/offline")),
        ),
    );
    return;
  }

  // Everything else (RSC payloads, API, mutations) is left to the network.
});
