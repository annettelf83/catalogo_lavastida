// Service Worker — Lavastida
//  - VOLATIL (navegaciones/HTML, v.txt, sw.js y el Worker de tasa):
//      RED PRIMERO con no-store -> nunca precios/tasa viejos.
//      Solo usa cache como respaldo si NO hay internet.
//  - ESTATICO (imagenes y fuentes): CACHE PRIMERO en cache versionado
//      (sitio rapido en internet lento). Se llena al vuelo; se limpia
//      el cache viejo al activar.

const CACHE = 'lavastida-assets-v21';   // <-- subir el sufijo en cada deploy
const ASSET_RE = /\.(?:jpe?g|png|webp|svg|gif|ico|otf|ttf|woff2?)$/i;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cross-origin (incluido el Worker de tasa): no interceptar, lo maneja el navegador.
  if (url.origin !== self.location.origin) return;

  // VOLATIL: navegaciones, HTML, raiz, v.txt, sw.js -> RED PRIMERO (no-store)
  const esVolatil =
    req.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('v.txt') ||
    url.pathname.endsWith('sw.js');

  if (esVolatil) {
    event.respondWith((async () => {
      try {
        return await fetch(req, { cache: 'no-store' });
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fallback = await caches.match('/index.html') || await caches.match('./index.html');
        if (fallback) return fallback;
        throw err;
      }
    })());
    return;
  }

  // 3) ESTATICO (imagenes/fuentes): CACHE PRIMERO en cache versionado
  if (ASSET_RE.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const resp = await fetch(req);
        if (resp && resp.ok && resp.status === 200) cache.put(req, resp.clone());
        return resp;
      } catch (err) {
        const hit2 = await cache.match(req);
        if (hit2) return hit2;
        throw err;
      }
    })());
    return;
  }
  // 4) Resto: comportamiento por defecto del navegador.
});
