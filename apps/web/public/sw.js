/*
 * Àjọ's service worker. It does one job: show a push as a notification and open the app when it is
 * tapped. It caches nothing and answers no requests, so it can never serve stale or foreign content.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/** Only a path inside the app is ever opened. */
const safeLink = (link) =>
  typeof link === "string" && link.startsWith("/") && !link.startsWith("//")
    ? link
    : "/notifications";

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" && data.title ? data.title.slice(0, 120) : "Àjọ";
  const body = typeof data.body === "string" ? data.body.slice(0, 200) : "Tap to open Àjọ.";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // A newer message of the same kind replaces the one still showing instead of piling up.
      tag: typeof data.tag === "string" ? data.tag.slice(0, 60) : "ajo",
      data: { link: safeLink(data.link) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = safeLink(event.notification.data && event.notification.data.link);
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const here = open.find((c) => new URL(c.url).origin === self.location.origin);
      if (here) {
        await here.focus();
        if ("navigate" in here) return here.navigate(link);
        return undefined;
      }
      return self.clients.openWindow(link);
    })(),
  );
});
