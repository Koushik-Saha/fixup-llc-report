self.addEventListener('install', (event) => {
    // Bypass the waiting lifecycle stage and force the new service worker to become active
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Claim the clients immediately so the service worker takes control right away
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // A minimal fetch handler is required by Chrome to trigger the "Install PWA" prompt
    // We will default to a network-first strategy, falling back gracefully
    event.respondWith(
        fetch(event.request).catch(function () {
            return caches.match(event.request);
        })
    );
});
