/* Self-destructing SW: previous version cached stale chunk hashes
   and broke navigation after rebuilds. Unregister and clear caches. */
self.addEventListener("install", (e) => { e.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    await self.clients.claim();
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(clients.map((c) => {
      const url = new URL(c.url);
      url.searchParams.set("sw-cleanup", Date.now().toString());
      return c.navigate(url.toString());
    }));
    await self.registration.unregister();
  })());
});