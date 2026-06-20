const CACHE_NAME = 'sounddeck-cache-v1';
const ASSETS = [
  'index.html',
  'logo.png',
  'jacket1.png',
  'jacket2.png',
  'jacket3.png',
  'jacket4.png',
  'jacket5.png',
  'jacket6.png',
  'jacket7.png',
  'jacket8.png',
  'jacket9.png',
  'jacket10.png',
  'jacket12.png',
  'song1.mp3',
  'song2.mp3',
  'song3.mp3',
  'song4.mp3',
  'song5.mp3',
  'song6.mp3',
  'song7.mp3',
  'song8.mp3',
  'song9.mp3',
  'song10.mp3',
  'song11.mp3',
  'song12.mp3',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      return cachedResponse || fetch(e.request);
    })
  );
});
