

# Plano: Corrigir SW Navigation Preload + redirectTo hardcoded

## Arquivo 1: `public/sw.js`

### Edição A — Remover chamada global do Navigation Preload (linhas 26-28)

Remover:
```javascript
if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}
```

### Edição B — Integrar Navigation Preload no evento `activate` (linhas 31-41)

Substituir o bloco `activate` atual por:

```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      if (workbox && workbox.navigationPreload && workbox.navigationPreload.isSupported()) {
        return workbox.navigationPreload.enable();
      }
    }).then(() => self.clients.claim())
  );
});
```

### Edição C — Fallback seguro no fetch handler (linhas 43-56)

Substituir por:

```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp && preloadResp.ok) return preloadResp;
        return await fetch(event.request);
      } catch (error) {
        const cache = await caches.open(CACHE);
        return await cache.match(offlineFallbackPage);
      }
    })());
  }
});
```

Adicionado check `preloadResp.ok` para rejeitar respostas com status de erro.

---

## Arquivo 2: `src/hooks/useAuth.ts`

### Edição A — Linha 9

**Antes:** `const redirectUrl = \`${window.location.origin}/\`;`
**Depois:** `const redirectUrl = 'https://subhumano.ia.br/';`

### Edição B — Linha 75

**Antes:** `const redirectUrl = \`${window.location.origin}/\`;`
**Depois:** `const redirectUrl = 'https://subhumano.ia.br/';`

---

## O que NÃO muda

- Push notification handlers no SW
- install handler e cache name no SW
- manifest.json, index.html
- signInWithGoogle e resetPassword (já usam URL absoluta)
- Nenhum outro arquivo

