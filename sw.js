// version.js is the single source of truth for GAME_VERSION -- folding it
// into CACHE_NAME means this file's own bytes change on every release, so
// registration.update()'s byte comparison (see index.html) actually has
// something to detect. Without this, sw.js could stay byte-identical
// across many releases and the mid-play update banner would never fire.
importScripts('version.js');
const CACHE_NAME = 'quiet-fishing-new-' + GAME_VERSION;
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './fish-data.js',
  './version.js',
  './manifest.json',
  './icons/app/icon-192.png',
  './icons/app/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first: always prefer a fresh copy (this project is under active
// development), falling back to the cache only when offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
