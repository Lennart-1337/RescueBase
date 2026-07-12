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
