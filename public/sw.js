// Service Worker para Web Push Notifications + Cache Offline - Subhumano

const CACHE_VERSION = 'subhumano-v2';
const OFFLINE_URL = '/offline.html';

// Shell do app para pre-cachear
const APP_SHELL = [
  '/',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// ============================
// PUSH NOTIFICATIONS (intacto)
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

// ============================
// CACHE OFFLINE
// ============================

self.addEventListener('install', function(event) {
  console.log('[SW] Instalado - versão:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      console.log('[SW] Cacheando app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Ativado');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_VERSION; })
          .map(function(name) {
            console.log('[SW] Removendo cache antigo:', name);
            return caches.delete(name);
          })
      );
    }).then(function() {
      return clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  // Ignorar requisições para APIs (Supabase, analytics, etc.)
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/~oauth')
  ) {
    return;
  }

  // Requisições de navegação: Network first -> Cache -> Offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // Cachear a resposta para uso offline
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(function(cache) {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(function() {
          return caches.match(event.request).then(function(cached) {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Assets estáticos: Cache first -> Network
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) {
          // Atualizar cache em background (stale-while-revalidate)
          fetch(event.request).then(function(response) {
            if (response.ok) {
              caches.open(CACHE_VERSION).then(function(cache) {
                cache.put(event.request, response);
              });
            }
          }).catch(function() {});
          return cached;
        }
        return fetch(event.request).then(function(response) {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
});
