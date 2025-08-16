// SW: קאשינג נכסים + ניווט SPA אופליין + עדכון חלק
const CACHE = 'app-cache-v4'; // עדכון גרסה לקאש בכל שינוי נכסים
const CORE = [
  '/',               // Netlify יעשה רידיירקט ל-/index.html
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;

  // ניווטי SPA – רשת קודם, ואם אין – index מהקאש
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(async () => (await caches.open(CACHE)).match('/index.html'))
    );
    return;
  }

  // נכסים סטטיים
  const dest = request.destination;
  if (['style', 'script', 'image', 'font'].includes(dest) || request.url.includes('/assets/')) {
    e.respondWith(cacheFirst(request));
    return;
  }

  // ברירת מחדל
  e.respondWith(
    fetch(request).catch(async () => (await caches.match(request)) || Response.error())
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request).then((resp) => resp.ok && cache.put(request, resp.clone())).catch(() => {});
    return cached;
  }
  const resp = await fetch(request);
  if (resp.ok) cache.put(request, resp.clone());
  return resp;
}

// הודעות מהאפליקציה
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'SHOW') {
    self.registration.showNotification(d.title || 'תזכורת', { body: d.body || '' });
  }
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
});
