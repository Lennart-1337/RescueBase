self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("rescuebase-shell-v1").then((cache) => cache.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => cacheResponse(request, response)).catch(() => caches.match(request).then((cached) => cached ?? caches.match("/"))));
    return;
  }
  if (["script", "style", "image", "font"].includes(request.destination)) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request).then((response) => cacheResponse(request, response))));
  }
});

async function cacheResponse(request, response) {
  if (response.ok) (await caches.open("rescuebase-shell-v1")).put(request, response.clone());
  return response;
}

self.addEventListener("push", (event) => {
  const fallback = { title: "RescueBase", body: "Es liegt eine neue Benachrichtigung vor.", tag: "rescuebase", url: "/admin" };
  const message = event.data ? { ...fallback, ...event.data.json() } : fallback;
  event.waitUntil(self.registration.showNotification(message.title, { body: message.body, data: { url: message.url }, icon: "/android-chrome-192x192.png", tag: message.tag }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((windowClient) => new URL(windowClient.url).origin === self.location.origin);
    const url = new URL(event.notification.data.url, self.location.origin).toString();
    return existing ? existing.navigate(url).then((windowClient) => windowClient?.focus()) : clients.openWindow(url);
  }));
});
