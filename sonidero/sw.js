// Service Worker — Sonidero Memexicanisimos PWA v10
const CACHE_NAME = 'sonidero-memexicanisimos-v10';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/sonidero.css',
  './js/sounds-b64.js?v=10',
  './js/sonidero-bundle.js?v=10',
  './worklets/noise-gate.js',
  './worklets/pitch-shifter.js',
  './assets/banner_sonidero_rotulo_horizontal.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/sounds/airhorn.ogg',
  './assets/sounds/police.ogg',
  './assets/sounds/backup.ogg',
  './assets/sounds/emergency.ogg',
  './assets/sounds/scratch.ogg',
  './assets/sounds/siren_sonidera.ogg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usar cache.addAll pero no fallar catastróficamente si algún audio opcional falta
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch((err) => console.warn('[SW] Cache miss:', url, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Devolver caché pero refrescar en segundo plano si hay red (stale-while-revalidate)
        fetch(event.request, { cache: 'no-cache' }).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request, { cache: 'no-cache' }).then((response) => {
        if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'default' && response.type !== 'cors')) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Si no hay red y se pedía la página HTML, regresar index.html en caché
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
