// Self-destructing service worker - uninstalls itself immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Unregister this service worker
      const registration = await self.registration;
      await registration.unregister();
      
      // Take control of all clients
      await self.clients.claim();
    })()
  );
});

// Don't cache anything - pass through all requests
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});