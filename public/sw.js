const CACHE_NAME = "loveline-shell-v3";
const STATIC_CACHE = "loveline-static-v3";
const DYNAMIC_CACHE = "loveline-dynamic-v3";

// Assets to cache on install
const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

// Install - cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches, claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) =>
              key.startsWith("loveline-") && 
              key !== STATIC_CACHE && 
              key !== DYNAMIC_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch - network first for navigation, stale-while-revalidate for static
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Skip API routes, auth, and FCM
  if (
    url.pathname === "/firebase-messaging-sw.js" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/v1/") ||
    url.pathname.startsWith("/rest/v1/")
  ) {
    return;
  }

  // Navigation requests - network first, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put("/index.html", copy));
          }
          return response;
        })
        .catch(() => 
          caches.match("/index.html").then((response) => response || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Static assets - stale-while-revalidate
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Everything else - network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((response) => response || caches.match("/offline.html")))
  );
});

// Handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Background sync for offline actions (if supported)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // Placeholder for offline message sync
  console.log("Background sync triggered");
}