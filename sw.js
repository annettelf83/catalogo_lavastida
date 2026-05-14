// Service Worker — fuerza red primero para HTML y v.txt, evitando cache stale
const VERSION = 'v18';

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Solo manejar mismo origen
  if (url.origin !== self.location.origin) return;

  // Para HTML, v.txt, y otros archivos volatiles: red primero
  const esVolatil = url.pathname.endsWith('/') ||
                    url.pathname.endsWith('.html') ||
                    url.pathname.endsWith('v.txt');

  if (esVolatil) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
  }
});
