// War Cove — Paper Game app shell worker.
//
// LAW (the game's state is live or it is wrong): this worker caches ONLY
// the static app-shell assets — the icons and the manifest. The board page
// (index.html) and EVERY data call (state.json, presence, market feeds)
// are NETWORK-ONLY: never cached, never intercepted into a cache, never
// served stale. Stale game state is wrong game state, so the board's data
// always comes off the live game, exactly as if no worker were installed.
var SHELL_CACHE = 'war-cove-game-shell-v1';
var SHELL_FILES = [
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'manifest.webmanifest'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      return cache.addAll(SHELL_FILES.map(function (f) {
        return new URL(f, self.registration.scope).href;
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === SHELL_CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // feeds/APIs: untouched
  var file = url.pathname.split('/').pop();
  if (SHELL_FILES.indexOf(file) === -1) return; // page + all game data: network-only, no interception
  // Static shell assets only: cache-first, refreshed from the network in the background.
  event.respondWith(
    caches.match(event.request).then(function (hit) {
      var refresh = fetch(event.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(SHELL_CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || refresh;
    })
  );
});
