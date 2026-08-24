const CACHE_NAME = "the-cut-shell-v1";
const SHELL_ASSETS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first for API calls (never serve stale gameplay/API data),
// cache-first for the app shell.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/")) {
    return; // let API calls go straight to the network, untouched
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Displays an incoming push message. The payload is plain JSON we control
// end to end (see lib/domain/push/sendPush.ts) — { title, body, url }.
self.addEventListener("push", (event) => {
  let data = { title: "THE CUT", body: "Today's Cut is waiting.", url: "/daily" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Malformed payload — fall back to the generic message above rather
    // than showing nothing at all.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/daily" },
    })
  );
});

// Tapping the notification focuses an existing tab if one's already open
// to the right place, otherwise opens a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/daily";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
