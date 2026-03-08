// Service Worker PWABuilder (Workbox) + Push Notifications - Subhumano
const SW_VERSION = "2.0.0";

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "pwabuilder-page-v2";
const offlineFallbackPage = "offline.html";

// ============================
// WORKBOX - CACHE OFFLINE
// ============================

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', async (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(offlineFallbackPage))
  );
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) return preloadResp;
        return await fetch(event.request);
      } catch (error) {
        const cache = await caches.open(CACHE);
        return await cache.match(offlineFallbackPage);
      }
    })());
  }
});

// ============================
// PUSH NOTIFICATIONS
// ============================

self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('[SW] Push event sem dados');
    return;
  }

  try {
    const data = event.data.json();

    const options = {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      tag: data.tag || 'subhumano-notification',
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      data: {
        url: data.url || '/',
        notificationId: data.notificationId,
        timestamp: Date.now()
      },
      actions: [
        { action: 'open', title: 'Ver' },
        { action: 'close', title: 'Fechar' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Subhumano', options)
    );
  } catch (error) {
    console.error('[SW] Erro ao processar push:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(urlToOpen).then(() => client.focus());
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notificação fechada:', event.notification.tag);
});
