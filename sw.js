const CACHE = "work-counter-v23";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./nbrb.woff2",
  "./nbrb.woff",
  "./nbrb.ttf"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate" || (req.url.includes("index.html"))) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match("./index.html").then((r) => r || caches.match("./"))
      )
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "SCHEDULE") {
    const ts = event.data.timestamp;
    self.registration.getNotifications({ tag: "reminder" }).then((n) => {
      n.forEach((x) => x.close());
    });
    self.registration.showNotification("Учёт работы", {
      body: "Не забудь внести сегодняшнюю работу",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: "reminder",
      renotify: true,
      showTrigger: new TimestampTrigger(ts),
      data: { url: "./index.html" }
    }).catch(() => {});
  }
  if (event.data && event.data.type === "CANCEL") {
    self.registration.getNotifications({ tag: "reminder" }).then((n) => {
      n.forEach((x) => x.close());
    });
  }
});

function showReminder(text) {
  return self.registration.showNotification("Учёт работы", {
    body: text || "Не забудь внести сегодняшнюю работу",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: "reminder-" + new Date().toISOString().slice(0, 10),
    renotify: true,
    data: { url: "./index.html" }
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("index.html") || client.url.includes(location.origin)) {
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
