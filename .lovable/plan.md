

# Implementacao do Service Worker PWABuilder para Google Play Console

## Resumo

Substituir o Service Worker atual (`public/sw.js`) pelo modelo Workbox do PWABuilder, criar uma nova pagina offline e registrar o SW no `index.html`. O SW atual ja tem logica de push notifications que precisa ser preservada e mesclada com o novo codigo Workbox.

## Desafio: Push Notifications existentes

O `sw.js` atual contem handlers de Push Notifications (`push`, `notificationclick`, `notificationclose`) que sao usados pelo hook `usePushNotifications.ts`. Se simplesmente substituirmos o SW pelo codigo Workbox fornecido, as notificacoes push vao parar de funcionar.

**Solucao**: Mesclar o codigo Workbox com os handlers de push existentes no mesmo arquivo.

## Alteracoes

### Tarefa 1: Substituir `public/offline.html`

Substituir o conteudo atual por uma pagina com visual do ecossistema Subhumano IA, exibindo a mensagem solicitada: "Voce esta offline. Verifique sua conexao de internet para acessar o Ecossistema Subhumano IA."

- Manter o visual dark (fundo preto, texto branco) consistente com o design system
- Incluir icone de wifi-off e botao "Tentar novamente"

### Tarefa 2: Substituir `public/sw.js`

Reescrever o Service Worker com:

1. Import do Workbox via CDN (`workbox-sw.js` v5.1.2)
2. Cache `pwabuilder-page` com fallback para `offline.html`
3. Navigation Preload habilitado
4. Fetch handler para modo `navigate` com fallback offline
5. **Preservar** os handlers de push notification existentes (`push`, `notificationclick`, `notificationclose`)

Estrutura final do arquivo:

```text
+------------------------------------------+
| importScripts (Workbox CDN)              |
| Cache + offline fallback setup           |
| message listener (SKIP_WAITING)          |
| install listener (cachear offline.html)  |
| navigationPreload.enable()               |
| fetch listener (navigate -> offline)     |
+------------------------------------------+
| Push notification handlers (preservados) |
| - push event                             |
| - notificationclick event                |
| - notificationclose event                |
+------------------------------------------+
```

### Tarefa 3: Registrar SW no `index.html`

Adicionar o script de registro do Service Worker antes do `</body>`, **antes** do script do Vite (`/src/main.tsx`):

```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
</script>
```

Isso garante que o SW e registrado globalmente na carga da pagina, independente do React.

## Impacto no codigo existente

| Arquivo | Acao |
|---|---|
| `public/offline.html` | Substituir conteudo com nova mensagem |
| `public/sw.js` | Reescrever com Workbox + push handlers preservados |
| `index.html` | Adicionar script de registro do SW |
| `src/hooks/usePushNotifications.ts` | Sem alteracao (ja registra o SW no mesmo path `/sw.js`) |

## Observacao sobre registro duplicado

O `usePushNotifications.ts` tambem registra o SW via `navigator.serviceWorker.register('/sw.js')`. Isso nao causa conflito -- o navegador reutiliza o mesmo registro se o path e escopo forem iguais. O registro no `index.html` garante que o SW esteja ativo mesmo antes do React carregar (requisito do PWABuilder/Play Store).

