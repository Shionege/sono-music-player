/**
 * sw.js
 * Service Worker for Anywhere Offline Music Player PWA
 * Guarantees 100% offline app shell loading and asset caching.
 */

const CACHE_NAME = 'anywhere-music-player-v27';
const ESSENTIAL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './storage.js',
  './metadata.js',
  './player.js',
  './transfer.js',
  './app.js',
  './manifest.json',
  './placeholder.png',
  './vendor/lucide.min.js',
  './vendor/jsmediatags.min.js',
  './vendor/peerjs.min.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/splash/splash-1290x2796.png',
  './icons/splash/splash-1179x2556.png',
  './icons/splash/splash-1284x2778.png',
  './icons/splash/splash-1170x2532.png',
  './icons/splash/splash-1242x2688.png',
  './icons/splash/splash-828x1792.png',
  './icons/splash/splash-1125x2436.png',
  './icons/splash/splash-1242x2208.png',
  './icons/splash/splash-750x1334.png'
];

// Install Service Worker and cache essential app shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Caching Essential App Shell');
      return Promise.allSettled(
        ESSENTIAL_ASSETS.map(asset => cache.add(asset).catch(e => console.warn('[SW] Asset cache warning:', asset, e)))
      );
    })
  );
});

// Activate event (clean up old caches and claim clients immediately)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event (Stale-While-Revalidate with Navigation Fallback)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Handle navigation (HTML page load) - ALWAYS serve cached index.html when offline
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match('./index.html').then((cachedIndex) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          }
          return networkResponse;
        }).catch(() => null);

        return cachedIndex || fetchPromise;
      })
    );
    return;
  }

  // Cache first for all app assets and CDNs
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update for cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        console.warn('[SW] Network fetch failed offline:', event.request.url);
      });
    })
  );
});
