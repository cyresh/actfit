/**
 * Strava Dash — service worker
 * Only caches the static app shell (this file's own origin: HTML, vendored
 * JS/CSS, icons). Strava API calls and the OAuth Worker are cross-origin and
 * always go straight to the network — never cached, since that data needs to
 * stay live. Bump CACHE_NAME on deploy to invalidate old cached shells.
 */
const CACHE_NAME = "strava-dash-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./chart.umd.js",
  "./vendor/leaflet.js",
  "./vendor/leaflet.css",
  "./vendor/images/marker-icon.png",
  "./vendor/images/marker-icon-2x.png",
  "./vendor/images/marker-shadow.png",
  "./vendor/images/layers.png",
  "./vendor/images/layers-2x.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {
      // Missing file shouldn't block install — app still works online either way
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests for the app shell — everything else
  // (Strava API, the OAuth worker, map tiles, Google Fonts) goes to the network.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached); // offline fallback to whatever's cached
      return cached || networkFetch;
    })
  );
});
