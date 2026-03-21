const CACHE_NAME = 'fixitup-v1';
const STATIC_ASSETS = [
  '/',
  '/staff/home',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache for navigation
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET and API requests — always go to network
  if (request.method !== 'GET' || request.url.includes('/api/')) {
    return;
  }

  // For navigation requests: network first, fallback to /staff/home
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/staff/home'))
    );
    return;
  }

  // For everything else: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      });
      return cached || fetched;
    })
  );
});
