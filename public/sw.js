// sw.js — Service Worker
const VERSION = 'v5';                 // העלה/י מספר כשיש שינוי נכסים
const CACHE   = `app-cache-${VERSION}`;
const CORE = [
  '/',                                 // עוזר בחלק מההגדרות/דפדפנים
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/assets/gr-logo.jpg',               // הבאנר — לאופליין
];

// התקנה: פרה-קאש + דלג המתנה
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

// הפעלה: מחיקת קאש ישן + שליטה מיידית
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

// ניווטים = רשת תחילה עם fallback ל-index.html, נכסים = cache-first
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' ||
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

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE);
    return (await cache.match('/index.html')) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) {
    // רענון ברקע
    fetch(request).then((resp) => {
      if (resp && resp.ok) cache.put(request, resp.clone());
    }).catch(() => {});
    return cached;
  }
  const resp = await fetch(request);
  if (resp && resp.ok) cache.put(request, resp.clone());
  return resp;
}

// הודעות/עדכון
self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  if (d.type === 'SHOW') {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      event.waitUntil(
        self.registration.showNotification(d.title || 'תזכורת', {
          body: d.body || '',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          dir: 'rtl',
        })
      );
    }
  }
});

// לחיצה על התראה: פתח/פקס חלון קיים
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clientsArr.length) {
      clientsArr[0].focus();
    } else {
      await self.clients.openWindow('/');
    }
  })());
});
