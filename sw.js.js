const CACHE_NAME = 'sounddeck-cache-v1';

// 🔒 ここにオフライン時にも使いたいファイルをすべてリストアップします
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './logo.PNG',
  // 🎵 音楽ファイル
  './song1.mp3', './song2.mp3', './song3.mp3', './song4.mp3', './song5.mp3',
  './song6.mp3', './song7.mp3', './song8.mp3', './song9.mp3', './song10.mp3',
  // 🖼️ ジャケット画像
  './jacket1.png', './jacket2.png', './jacket3.png', './jacket4.png', './jacket5.png',
  './jacket6.png', './jacket7.png', './jacket8.png', './jacket9.png', './jacket10.png'
];

// インストール時にファイルをキャッシュに保存
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('音楽とアセットをキャッシュ中...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// オフライン時はキャッシュからファイルを返す
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // キャッシュがあればそれを返し、なければネットから取得する
      return response || fetch(event.request);
    })
  );
});