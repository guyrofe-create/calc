/* SW בסיסי: קאש לנכסים + ניווט SPA אופליין + עדכון גרסה עם SKIP_WAITING */
const CACHE = 'app-cache-v8';
const CORE = [
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/assets/gr-logo.jpg',
];

// התקנה – קאש ל-CORE
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

// אקטיבציה – ניקוי קאש ישן ו-claim
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

// ניווטי SPA: רשת תחילה, ואם נכשלה – index.html מהקאש
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

  const dest = req.destination;
  if (['style', 'script', 'image', 'font'].includes(dest) || req.url.includes('/assets/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // ברירת מחדל: רשת ואם נכשלה – קאש
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

async function networkFirstNavigation(req) {
  try {
    const fresh = await fetch(req);
    return fresh;
  } catch {
    const cache = await caches.open(CACHE);
    return (await cache.match('/index.html')) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) {
    // רענון ברקע
    fetch(req).then((r) => r.ok && cache.put(req, r.clone())).catch(() => {});
    return hit;
  }
  const resp = await fetch(req);
  if (resp.ok) cache.put(req, resp.clone());
  return resp;
}

// הודעות/עדכון מידי
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'SHOW') {
    self.registration.showNotification(d.title || 'תזכורת', { body: d.body || '' });
  }
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
});
