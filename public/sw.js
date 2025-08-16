// SW בסיסי: קאשינג לנכסים סטטיים + ניווט SPA אופליין + עדכון חלק
const CACHE = 'app-cache-v6'; // ← בכל שינוי נכסים, להעלות גרסה (v7, v8...)
const CORE = [
  '/',               // ב-Netlify יש רידיירקט ל-/index.html
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;

  // ניווטי SPA – נסה רשת, אם אין רשת חזור ל-index.html מהקאש
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(async () => (await caches.open(CACHE)).match('/index.html'))
    );
    return;
  }

  // נכסים סטטיים (build של Vite תחת /assets/, תמונות, סקריפטים, סטייל)
  const dest = request.destination;
  if (['style', 'script', 'image', 'font'].includes(dest) || request.url.includes('/assets/')) {
    e.respondWith(cacheFirst(request));
    return;
  }

  // ברירת מחדל – נסה רשת, ואם אין – מהקאש (אם קיים)
  e.respondWith(
    fetch(request).catch(async () => (await caches.match(request)) || Response.error())
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) {
    // רענון מאחורי הקלעים (Stale-While-Revalidate)
    fetch(request).then((resp) => resp.ok && cache.put(request, resp.clone())).catch(() => {});
    return cached;
  }
  const resp = await fetch(request);
  if (resp.ok) cache.put(request, resp.clone());
  return resp;
}

// קבלת הודעות מהאפליקציה (עדכון/התראות)
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  if (d.type === 'SHOW') {
    self.registration.showNotification(d.title || 'תזכורת', { body: d.body || '' });
  }
});
