const CACHE = 'prelude-v1';
const FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/css/styles.css',
  '/js/app.js',
  '/js/audio.js',
  '/js/curriculum.js',
  '/js/graphics.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Only cache same-origin GET requests
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      if (res.ok) caches.open(CACHE).then(cache => cache.put(e.request, clone));
      return res;
    }))
  );
});
