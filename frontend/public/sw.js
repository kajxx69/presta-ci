const CACHE_NAME = 'prestaci-v2.0.0';
const DATA_CACHE_NAME = 'prestaci-data-v2.0.0';

const urlsToCache = [
  '/',
  '/manifest.json'
];

// Endpoints de données "consultables hors-ligne" (stale-while-revalidate)
const CACHEABLE_API = [
  '/api/categories',
  '/api/sous_categories',
  '/api/services',
  '/api/prestataires',
  '/api/plans_abonnement',
];

function isCacheableApi(url) {
  const u = new URL(url);
  return CACHEABLE_API.some((path) => u.pathname === path || u.pathname.startsWith(path + '/'));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME && name !== DATA_CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET et ressources de dev
  if (request.method !== 'GET' ||
      request.url.includes('hot-update') ||
      request.url.includes('@vite')) {
    return;
  }

  // Données publiques : stale-while-revalidate (réponse cache immédiate + refresh en fond)
  if (isCacheableApi(request.url)) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => null);
        // Réseau d'abord si rien en cache, sinon cache immédiat
        return cached || network.then((r) => r || new Response('[]', {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Offline': '1' },
        }));
      })
    );
    return;
  }

  // Autres appels API (authentifiés, mutations…) : réseau uniquement
  if (request.url.includes('/api/')) return;

  // App shell et assets statiques
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.url.match(/\.(js|css|png|jpg|jpeg|webp|svg|woff2?)$/)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/').then((index) => index || new Response('Hors ligne', { status: 503 }));
          }
          return new Response('Hors ligne', { status: 503 });
        });
      })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'PrestaCI',
    body: 'Nouvelle notification',
    icon: '/prestaci-icon-192.png',
    badge: '/prestaci-icon-192.png',
    data: {}
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, data)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
