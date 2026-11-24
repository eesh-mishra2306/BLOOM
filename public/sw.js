/* BLOOM service worker: keeps the offline SOS page, shows alerts, confirms delivery. */
const CACHE = "bloom-offline-v1";
const OFFLINE_URL = "/sos-offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/badge-72.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Cache what we can; a missing icon must never block the emergency page.
      await Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  const url = new URL(req.url);
  // The SOS screen must appear fast: if the network is slow or gone, show the offline one.
  const emergency = url.pathname === "/sos";
  event.respondWith(
    (async () => {
      try {
        return emergency ? await withTimeout(fetch(req), 4000) : await fetch(req);
      } catch {
        const cached = await caches.match(OFFLINE_URL);
        return (
          cached ||
          new Response("You're offline. In an emergency, call 112.", { headers: { "content-type": "text/plain; charset=utf-8" } })
        );
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "BLOOM", body: event.data ? event.data.text() : "" };
  }
  const urgent = data.kind === "sos" || data.kind === "journey_missed";
  const checkin = data.kind === "checkin" && data.j;
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || "BLOOM", {
        body: data.body || "",
        tag: data.tag,
        renotify: true,
        requireInteraction: urgent || checkin,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        vibrate: urgent ? [300, 120, 300, 120, 600] : checkin ? [250, 120, 250] : [120],
        actions: checkin ? [{ action: "checkin", title: "I’m okay" }] : [],
        data: { url: data.url || "/", j: checkin ? data.j : null },
      });
      // Tell the sender the alert reached this device.
      if (data.d && data.r) {
        try {
          await fetch("/api/safety/receipt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ d: data.d, r: data.r }) });
        } catch {}
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const journeyId = event.notification.data && event.notification.data.j;
  // "I'm okay" right from the reminder: check in without opening BLOOM.
  if (event.action === "checkin" && journeyId) {
    event.waitUntil(
      (async () => {
        try {
          const res = await fetch("/api/journey/" + journeyId, {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "check_in" }),
          });
          if (res.ok) {
            await self.registration.showNotification("Checked in", { body: "Thanks. BLOOM will ask again at your next check-in.", tag: "checkin-" + journeyId, icon: "/icons/icon-192.png", badge: "/icons/badge-72.png" });
            return;
          }
        } catch {}
        await self.clients.openWindow("/journey");
      })(),
    );
    return;
  }
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of windows) {
        if (w.url === target && "focus" in w) return w.focus();
      }
      return self.clients.openWindow(target);
    })(),
  );
});
