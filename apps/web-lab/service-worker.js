/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 ajilisaifeddine-lab
 * This file is part of Bayda Lab. See LICENSE for the full terms.
 */
const CACHE_NAME = 'bayda-cache';
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./polish.css",
  "./kid-ui.css",
  "./dict-ui.js",
  "./lang-picker.js",
  "./settings.js",
  "./ui.js",
  "./kid-mode.js",
  "./assets/logo.png",
  "./assets/mascot.webp",
  "./assets/amazigh.png",
  "./assets/kabyle.png",
  "./assets/tn.png",
  "./assets/dz.png",
  "./assets/ly.png",
  "./assets/mr.png"
];

// التثبيت: نضع الملفات في الكاش، لكننا لا نجبر التحديث
self.addEventListener('install', (event) => {
  event.waitUntil(
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
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
