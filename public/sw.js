/*
 * NaughtyFish service worker — installable PWA + offline resilience.
 *
 * This is a FINANCIAL ledger, so correctness > aggressive caching:
 *   - App shell + hashed static assets are cached so the app boots with no signal.
 *   - PAGE navigations + Next.js RSC data fetches use NETWORK-FIRST: online we
 *     always fetch live data (never a stale balance); the cache is only a
 *     fallback when the network genuinely fails, then /offline.
 *   - Only same-origin GET is ever cached. Mutations always hit the network.
 *   - Redirects/errors are never cached.
 *   - CLEAR_PAGES lets the app purge cached pages on logout.
 *
 * Bump VERSION to invalidate every cache on the next activation.
 */
const VERSION = "nf-v2";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const RSC_CACHE = `${VERSION}-rsc`;

const PRECACHE = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Per-item so one failed resource can't abort the whole install.
      await Promise.allSettled(PRECACHE.map((u) => cache.add(u)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data === "CLEAR_PAGES") {
    caches.delete(PAGE_CACHE);
    caches.delete(RSC_CACHE);
  }
});

function isHashedAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

/** A Next.js RSC data fetch (client-side navigation / prefetch). */
function isRscRequest(req, url) {
  return req.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
}

/** A full page / document request (real navigation or a warm-up html fetch). */
function isPageRequest(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

/** Cache key for an RSC request, normalized so the ?_rsc=<hash> buster matches. */
function rscKey(rawUrl) {
  const u = new URL(rawUrl);
  u.searchParams.delete("_rsc");
  return u.href;
}

/** Only cache clean, final, same-origin 200s — never redirects or errors. */
function cacheable(res) {
  return res && res.status === 200 && res.type === "basic" && !res.redirected;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Hashed, immutable build assets → cache-first.
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (cacheable(res)) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // RSC data fetches (how a SPA navigates) → network-first, normalized cache key.
  if (isRscRequest(req, url)) {
    const key = rscKey(req.url);
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable(res)) {
            const copy = res.clone();
            caches.open(RSC_CACHE).then((c) => c.put(key, copy));
          }
          return res;
        })
        .catch(() => caches.open(RSC_CACHE).then((c) => c.match(key, { ignoreVary: true }))),
    );
    return;
  }

  // Full page / document requests → network-first, cache fallback, then /offline.
  if (isPageRequest(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable(res)) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(PAGE_CACHE);
          const hit = await cache.match(req, { ignoreVary: true });
          return hit || caches.match("/offline");
        }),
    );
    return;
  }

  // Everything else (non-hashed assets, misc GET) is left to the network.
});
