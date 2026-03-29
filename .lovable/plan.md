

# Plano: Detecção de bot via User-Agent no og-meta

## Arquivo: `supabase/functions/og-meta/index.ts`

### Edição 1 — Adicionar BOT_PATTERNS + isBot (após linha 14)

```typescript
const BOT_PATTERNS = [
  'facebookexternalhit', 'facebot', 'twitterbot', 'linkedinbot',
  'whatsapp', 'telegrambot', 'slackbot', 'discordbot',
  'googlebot', 'bingbot', 'applebot', 'pinterestbot',
  'snapchat', 'redditbot', 'skypeuripreview',
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(pattern => ua.includes(pattern));
}
```

### Edição 2 — buildHtml recebe isBot (linha 29-66)

Adicionar `isBot = false` como segundo parâmetro. Substituir o `<script>` fixo (linha 61) por condicional:

```typescript
${isBot ? '' : `<script>window.location.href="${meta.url.replace(/"/g, '\\"')}";</script>`}
```

### Edição 3 — Extrair UA e logar (após linha 79)

```typescript
const userAgent = req.headers.get('user-agent') || '';
const bot = isBot(userAgent);
console.log('og-meta ua:', { isBot: bot, ua: userAgent.slice(0, 120) });
```

### Edição 4 — Passar `bot` em todas as chamadas buildHtml

4 chamadas no total:
- Linha 89: `buildHtml({ ... }, bot)`
- Linha 127: `buildHtml({ ... }, bot)`
- Linha 150: `buildHtml({ ... }, bot)`
- Linha 174: `buildHtml({ ... }, bot)`

## Não alterado

- Nenhum outro arquivo
- Banco / RLS
- Outras Edge Functions

