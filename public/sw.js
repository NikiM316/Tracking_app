const VERSION = "v3";
const PRECACHE = `tracker-precache-${VERSION}`;
const STATIC_CACHE = `tracker-static-${VERSION}`;
const PAGE_CACHE = `tracker-pages-${VERSION}`;
const EXPECTED_CACHES = new Set([PRECACHE, STATIC_CACHE, PAGE_CACHE]);

const PRECACHE_PAGES = ["/", "/today", "/monk", "/finance", "/offline.html"];
const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon.png",
  "/apple-icon.png",
  "/favicon.ico",
];

const STATIC_PATH =
  /^\/(_next\/static\/|icon-192\.png$|icon-512\.png$|icon\.png$|apple-icon\.png$|favicon\.ico$|manifest\.webmanifest$)/;
const STATIC_EXT = /\.(?:png|ico|svg|webp|jpe?g|gif|woff2?|webmanifest)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const [pageCache, assetCache] = await Promise.all([
        caches.open(PAGE_CACHE),
        caches.open(PRECACHE),
      ]);
      await Promise.all([
        precacheInto(pageCache, PRECACHE_PAGES),
        precacheInto(assetCache, PRECACHE_ASSETS),
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => (EXPECTED_CACHES.has(key) ? undefined : caches.delete(key))),
      );
      if ("navigationPreload" in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname === "/sw.js" || isUncacheableNextRequest(request, url)) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event, url));
  }
});

function isUncacheableNextRequest(request, url) {
  if (url.searchParams.has("_rsc")) {
    return true;
  }
  if (url.pathname.startsWith("/__nextjs")) {
    return true;
  }
  const headers = request.headers;
  return (
    headers.has("RSC") ||
    headers.has("Next-Router-Prefetch") ||
    headers.has("Next-Router-State-Tree") ||
    headers.has("Next-Action")
  );
}

function isStaticAsset(url) {
  return STATIC_PATH.test(url.pathname) || STATIC_EXT.test(url.pathname);
}

function pageKey(url) {
  return url.pathname;
}

async function precacheInto(cache, urls) {
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { credentials: "same-origin" });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch {
        // A missing route must not block install (e.g. /today if the DB is down).
      }
    }),
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

async function handleNavigation(event, url) {
  const cache = await caches.open(PAGE_CACHE);
  const key = pageKey(url);
  const cached = await cache.match(key);

  const networkPromise = (async () => {
    const preloaded = await event.preloadResponse;
    const response = preloaded ?? (await fetch(event.request));
    if (response && response.ok) {
      await cache.put(key, response.clone());
    }
    return response;
  })();

  if (cached) {
    void networkPromise.catch(() => {});
    return cached;
  }

  try {
    const response = await networkPromise;
    if (response && response.ok) {
      return response;
    }
  } catch {
    // Fall through to the offline page.
  }

  return (
    (await caches.match("/offline.html")) ??
    new Response("Offline", { status: 503, statusText: "Offline" })
  );
}
