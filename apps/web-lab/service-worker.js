const CACHE_NAME = 'bayda-dynamic-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.json',
  './assets/logo.png',
  './assets/kabyle.png',
  './assets/amazigh.png'
];

// التثبيت: نضع الملفات في الكاش، لكننا لا نجبر التحديث
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// التفعيل: نحذف الكاش القديم ونستعد للعمل
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// استقبال رسالة من الواجهة لتفعيل التحديث
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// الجلب: استراتيجية (Stale-While-Revalidate) لضمان السرعة والتحديث
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, networkResponse.clone());
        });
        return networkResponse;
      }).catch(() => {
        // إذا فشلت الشبكة (السيرفر مغلق)، نرجع للمخزن
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
