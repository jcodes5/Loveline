const CACHE_NAME = "loveline-shell-v4";
const STATIC_CACHE = "loveline-static-v4";
const DYNAMIC_CACHE = "loveline-dynamic-v4";

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

// Load the Firebase messaging worker so this service worker can configure
// FCM on demand and show background notifications.
importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js",
);

let firebaseApp = null;
let messagingConfigured = false;

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

  // Private and user-uploaded images must always be fetched from the network.
  if (request.destination === "image" || /\.(avif|bmp|gif|heic|jpe?g|png|svg|tiff?|webp|ico)$/i.test(url.pathname)) {
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
    request.destination === "font" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok && response.type === "basic") {
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
        if (response.ok && response.type === "basic") {
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

  if (event.data?.type === "loveline-configure-fcm") {
    configureFcm(event);
  }
});

function configureFcm(event) {
  try {
    if (!firebaseApp) {
      firebaseApp = firebase.initializeApp(event.data.config);
    }

    if (!messagingConfigured) {
      messagingConfigured = true;
      const messaging = firebase.messaging(firebaseApp);
      messaging.onBackgroundMessage((payload) => {
        const notificationTitle = payload.notification?.title || "A little note from Loveline";
        const notificationOptions = {
          body: payload.notification?.body || "Your person left something for you.",
          icon: "/icon-192.png",
          badge: "/icon-72.png",
          tag: "loveline-personal-message",
          data: { url: "/" },
          requireInteraction: true,
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
      });
    }

    if (event.source) {
      event.source.postMessage({ type: "loveline-fcm-configured" });
    } else {
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "loveline-fcm-configured" }));
      });
    }
  } catch (error) {
    console.error("FCM configuration failed:", error);
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => "focus" in client);
      if (existingClient) {
        existingClient.navigate(targetUrl);
        return existingClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
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
