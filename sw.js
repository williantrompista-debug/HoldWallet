const CACHE = 'holdwallet-v2';
const FILES = ['./', './index.html', './styles.css', './app.js', './config.js', './manifest.json', './assets/icon.png', './assets/mascot.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// Rede primeiro, cache como reserva. Só para os arquivos do app e a biblioteca do CDN;
// as chamadas ao Supabase nunca passam pelo cache.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const cacheable = url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net';
  if (!cacheable) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))
  );
});
