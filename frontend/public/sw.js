const CACHE_NAME = 'autobells-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch (Network only)
  // This is a minimal valid Service Worker to satisfy PWA installability criteria
  event.respondWith(fetch(event.request));
});
