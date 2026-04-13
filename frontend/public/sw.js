const CACHE_NAME = 'prestaci-v1.0.0';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes vers l'API backend et les pages en développement
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('localhost:4000') ||
      event.request.url.includes('hot-update') ||
      event.request.url.includes('@vite') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // En cas d'erreur réseau, retourner une réponse par défaut pour les pages
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      }
    )
  );
});

// Gérer les notifications push
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'PrestaCI',
    body: 'Nouvelle notification',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    data: {}
  };

  // Parser les données de la notification si disponibles
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.data || {},
        actions: data.actions || [],
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false
      };
    } catch (e) {
      // Si ce n'est pas du JSON, utiliser le texte brut
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Gérer les clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  // Envoyer un message au client principal
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre est déjà ouverte, l'utiliser
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'notification-click',
            action: action,
            notificationType: notificationData.type,
            data: notificationData
          });
          return client.focus();
        }
      }
      
      // Sinon, ouvrir une nouvelle fenêtre
      let url = '/';
      
      // Rediriger selon le type de notification
      switch (notificationData.type) {
        case 'nouvelle_reservation':
          url = '/prestataire/reservations';
          break;
        case 'reservation_confirmee':
        case 'reservation_refusee':
          url = '/client/reservations';
          break;
        case 'nouvel_avis':
          url = '/prestataire/avis';
          break;
        case 'service_termine':
          url = '/client/reservations';
          break;
        case 'abonnement_expire':
          url = '/prestataire/plans';
          break;
        case 'rappel_rdv':
          url = '/client/reservations';
          break;
        default:
          url = '/dashboard';
      }
      
      return clients.openWindow(url);
    })
  );
});

// Gérer la fermeture des notifications
self.addEventListener('notificationclose', (event) => {
  console.log('Notification fermée:', event.notification.data);
});