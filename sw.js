
const CACHE_NAME = 'infofix-crm-v5';
const STATIC_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event: Cache core files immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force this SW to become the active one
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_URLS);
    })
  );
});

// Activate Event: Clean up old caches
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
    })
  );
  self.clients.claim(); // Take control of all open clients immediately
});

// Fetch Event: Robust caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. API Requests: Network Only
  // We do not cache Supabase API calls to prevent stale data in a CRM context.
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // 2. Navigation (HTML): Network First -> Cache Fallback
  // This ensures the user gets the latest version of the app if online,
  // but falls back to the cached index.html if offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
            return caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response.clone());
                return response;
            });
        })
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // 3. Static Assets (JS, CSS, Images, Fonts): Stale-While-Revalidate
  // Serve from cache immediately for speed, then update cache from network in background.
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'image' ||
    event.request.destination === 'font'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            // Check if we received a valid response
            if(networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
             // If network fails and no cache, nothing we can do
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 4. Default: Cache Match -> Network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
