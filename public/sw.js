// Service Worker para Web Push Notifications - Subhumano

// Versão do cache
const CACHE_VERSION = 'v1';

// Escuta push events do servidor
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

// Quando usuário clica na notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Se clicou em "Fechar", não faz nada
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Procura uma janela/aba já aberta do app
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navega para a URL e foca na aba
          return client.navigate(urlToOpen).then(() => client.focus());
        }
      }
      // Se não encontrou, abre nova aba
      return clients.openWindow(urlToOpen);
    })
  );
});

// Quando notificação é fechada (swipe away)
self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notificação fechada:', event.notification.tag);
});

// Evento de instalação do Service Worker
self.addEventListener('install', function(event) {
  console.log('[SW] Instalado - versão:', CACHE_VERSION);
  self.skipWaiting();
});

// Evento de ativação
self.addEventListener('activate', function(event) {
  console.log('[SW] Ativado');
  event.waitUntil(clients.claim());
});
