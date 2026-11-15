/*
 * Ledger service worker.
 * - Offline: keeps the app's files on the device so the installed app opens without a connection
 *   (the data itself comes from Firestore's on-device copy).
 * - Reminders: shows push notifications and opens the app when one is tapped.
 */

/* Filled in by the build (vite.config.ts › precacheManifest) with every file the app needs. */
const PRECACHE = { version: 'dev', files: [] };

const CACHE = `ledger-${PRECACHE.version}`;
/** How long a page load waits for the network before using the saved app (slow connections). */
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.files))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('ledger-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? page(request) : file(request));
});

/** Pages: the newest version when online, the saved app when offline or the network is too slow. */
async function page(request) {
  const network = fetch(request);
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  try {
    const response = await Promise.race([network, timeout]);
    if (response) return response;
  } catch {
    // offline: fall through to the saved app
  }
  return (await caches.match('/', { cacheName: CACHE })) ?? network;
}

/** Built files have content hashes in their names, so a saved copy is always the right one. */
async function file(request) {
  return (await caches.match(request, { cacheName: CACHE })) ?? fetch(request);
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Ledger', {
      body: data.body || 'A habit is waiting for you.',
      icon: '/icon-192.png',
      badge: '/favicon-32.png',
      tag: data.tag || 'ledger-reminder',
      renotify: true,
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      return open ? open.focus().then((w) => w.navigate(url)) : self.clients.openWindow(url);
    }),
  );
});
