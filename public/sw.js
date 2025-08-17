/* SW: קאש לנכסים + ניווט SPA אופליין + טיפול JS network-first + עדכון גרסה */
const CACHE = 'app-cache-v20';
const CORE = [
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/assets/gr-logo.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  // ← חשוב: סקריפטים תמיד network-first כדי שלא "יחסרו" נכסי build
  if (req.destination === 'script') {
    event.respondWith(networkFirstAsset(req));
    return;
  }

  const dest = req.destination;
  if (['style', 'image', 'font'].includes(dest) || req.url.includes('/assets/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

async function networkFirstNavigation(req) {
  try {
    return await fetch(req);
  } catch {
    const cache = await caches.open(CACHE);
    return (await cache.match('/index.html')) || Response.error();
  }
}

async function networkFirstAsset(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return (await caches.match(req)) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) {
    fetch(req).then((r) => r.ok && cache.put(req, r.clone())).catch(() => {});
    return hit;
  }
  const resp = await fetch(req);
  if (resp.ok) cache.put(req, resp.clone());
  return resp;
}

self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'SHOW') {
    self.registration.showNotification(d.title || 'תזכורת', { body: d.body || '' });
  }
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
});
