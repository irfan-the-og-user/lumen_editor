const CACHE_NAME = 'lumen-editor-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons.svg'
];

// Install Event: Precache core shell assets & skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Claim clients & clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Stale-While-Revalidate strategy for static assets, HTML navigation fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip non-HTTP/HTTPS requests (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // Handle API requests separately - do not cache dynamic API POST/GET if any
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      // Fetch from network to update cache in background (Stale-While-Revalidate)
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
            cache.put(event.request, networkResponse.clone());
          } else if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'opaque') {
            // For CORS assets like Google Fonts
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed or offline
          return null;
        });

      // If we have a cached response, return it instantly while updating in background
      if (cachedResponse) {
        // Trigger background fetch if online
        event.waitUntil(fetchPromise);
        return cachedResponse;
      }

      // If not in cache, wait for network
      const networkResponse = await fetchPromise;
      if (networkResponse) {
        return networkResponse;
      }

      // If network fails and it's a navigation request, serve index.html from cache
      if (event.request.mode === 'navigate') {
        const indexFallback = await cache.match('/index.html') || await cache.match('/');
        if (indexFallback) {
          return indexFallback;
        }
      }

      // Fail gracefully
      return new Response('Offline resource unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain' })
      });
    })
  );
});
