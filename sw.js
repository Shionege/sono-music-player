/**
 * sw.js
 * Service Worker for Anywhere Offline Music Player PWA
 * Caches application assets for offline playback.
 */

const CACHE_NAME = 'sono-music-player-v19';
const ASSETS_TO_CACHE = [
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
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/splash/splash-1242x2688.png',
  './icons/splash/splash-828x1792.png',
  './icons/splash/splash-1125x2436.png',
  './icons/splash/splash-1170x2532.png',
  './icons/splash/splash-1284x2778.png',
  './icons/splash/splash-1179x2556.png',
  './icons/splash/splash-1290x2796.png',
  './icons/splash/splash-750x1334.png',
  './icons/splash/splash-1242x2208.png'
];

// Install Service Worker and cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching App Shell Assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate event (clean up old caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event (Cache First, falling back to Network)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isInternal = event.request.url.startsWith(self.location.origin);
  const isCDN = event.request.url.includes('unpkg.com') || 
                event.request.url.includes('cdnjs.cloudflare.com') ||
                event.request.url.includes('fonts.googleapis.com') ||
                event.request.url.includes('fonts.gstatic.com');

  if (isInternal || isCDN) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
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
          console.warn('Network fetch failed for offline resource:', err);
        });
      })
    );
  }
});
