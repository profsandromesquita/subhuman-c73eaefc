

# Plano: Fase 2 — Imagem OG determinística para WhatsApp

## Diagnóstico atualizado (pós-Fase 1)

Dos testes com curl, identifiquei **dois problemas críticos** que explicam a falha:

### Problema A — `Content-Type: text/plain`
A Edge Function retorna `Content-Type: text/plain` nos headers da resposta (visível no curl), mesmo com o código definindo `text/html; charset=utf-8`. O gateway Supabase está sobrescrevendo o header. Crawlers rigorosos podem ignorar OG tags em respostas `text/plain`.

### Problema B — og:image via Render API é instável
A URL da imagem usa `/render/image/public/...webp?width=1200&height=630&resize=cover&quality=85`. Este endpoint:
- Mantém extensão `.webp` no path (confunde crawlers que checam extensão)
- Pode ser lento/instável, causando timeout no crawler
- Adiciona latência desnecessária à resolução da imagem

## Solução (3 edições em `og-meta/index.ts`)

### Edição 1 — Simplificar `getImageUrl`: servir URL original sem transformação

Remover toda a lógica de `/render/image/`. Servir a `thumbnail_url` original diretamente (o Supabase Storage com `/object/public/` responde rápido e com Content-Type correto). O fallback continua sendo `DEFAULT_IMAGE`.

```typescript
function getImageUrl(thumbnailUrl: string | null): string {
  if (!thumbnailUrl || thumbnailUrl.trim() === '') {
    return DEFAULT_IMAGE;
  }
  return thumbnailUrl;
}
```

### Edição 2 — Remover `isWhatsApp()` e parâmetro `forWhatsApp`

Com a simplificação da imagem, não há mais necessidade de diferenciar por UA para a imagem. Remover a função `isWhatsApp` e todas as referências a `whatsapp` no fluxo de imagem.

### Edição 3 — Atualizar todas as chamadas

- `getImageUrl(post.thumbnail_url)` — sem segundo parâmetro
- `getImageUrl(null)` — nos fallbacks
- Remover `imageType` das chamadas a `buildHtml` — usar `image/webp` fixo (que é o formato real das thumbnails)
- Remover o parâmetro `whatsapp` da função `serve`

### Edição 4 — Forçar `Content-Type` com workaround

Adicionar header duplicado para tentar forçar o tipo correto pelo gateway:

```typescript
headers: {
  ...corsHeaders,
  'Content-Type': 'text/html; charset=utf-8',
  'content-type': 'text/html; charset=utf-8',
},
```

Se o gateway ignora case-sensitive, pelo menos um deve passar. Também adicionar `X-Content-Type-Options: nosniff`.

## Resultado esperado

- og:image aponta para URL direta do Storage (`/object/public/...`) — rápida, estável, sem transformação
- HTML retornado com Content-Type mais provável de ser `text/html`
- Sem lógica condicional por UA para imagem — simplificação total

## O que NÃO muda

- Detecção de bot (`isBot`, `BOT_PATTERNS`) — mantida
- Lógica de redirect JS vs bot — mantida
- Query ao banco — mantida
- Nenhum outro arquivo

## Observação sobre Fase 3

Se após este deploy o artigo "mythos" continuar sem preview mas o "vazamento" funcionar, o problema é **roteamento externo** (Cloudflare Worker / proxy não encaminha o slug correto para a Edge Function). Isso será Fase 3.

