// Einfacher Service Worker: merkt sich die App-Dateien, damit die App schneller
// startet und die Oberfläche auch ohne Netz lädt. Daten aus Google Drive werden
// bewusst NICHT zwischengespeichert.
const CACHE = "basislager-v1"; // bei Problemen auf "v2" erhöhen, das leert den Zwischenspeicher
const MAX_ENTRIES = 80;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

async function remember(req, res) {
  const cache = await caches.open(CACHE);
  await cache.put(req, res);
  const keys = await cache.keys();
  if (keys.length > MAX_ENTRIES) await cache.delete(keys[0]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Fremde Adressen (Google, OpenStreetMap, ...) nicht anfassen
  if (url.origin !== self.location.origin) return;

  // Dateien mit Hash im Namen ändern sich nie: zuerst im Zwischenspeicher nachsehen
  if (url.pathname.includes("/assets/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) event.waitUntil(remember(req, res.clone()));
            return res;
          })
      )
    );
    return;
  }

  // Alles andere (z. B. die Startseite): erst Netz, ohne Netz aus dem Zwischenspeicher
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) event.waitUntil(remember(req, res.clone()));
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match(self.registration.scope))
      )
  );
});