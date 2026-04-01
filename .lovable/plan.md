

# Plano: Fix WhatsApp OG preview — robots.txt + JPEG transform

## Arquivo 1: `public/robots.txt`

Adicionar ao final do arquivo existente (após linha 14):

```
User-agent: meta-externalagent
Allow: /

User-agent: WhatsApp
Allow: /
```

## Arquivo 2: `supabase/functions/og-meta/index.ts`

### Edição 1 — Adicionar `isWhatsApp()` e `getImageUrl()` (após linha 26, substituindo `getOgImageUrl`)

Remover `getOgImageUrl` (linhas 28-33) e adicionar:

```typescript
function isWhatsApp(userAgent: string): boolean {
  return userAgent.toLowerCase().includes('whatsapp') ||
    userAgent.toLowerCase().includes('meta-externalagent');
}

function getImageUrl(thumbnailUrl: string | null, forWhatsApp: boolean): string {
  if (!thumbnailUrl || thumbnailUrl.trim() === '') {
    if (forWhatsApp) {
      return DEFAULT_IMAGE.includes('.webp')
        ? DEFAULT_IMAGE.replace(
            '/object/public/',
            '/render/image/public/'
          ) + '?width=1200&height=630&resize=cover&format=jpg&quality=90'
        : DEFAULT_IMAGE;
    }
    return DEFAULT_IMAGE;
  }

  if (forWhatsApp && thumbnailUrl.includes('/storage/v1/object/public/')) {
    const renderUrl = thumbnailUrl
      .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
      .split('?')[0];
    return `${renderUrl}?width=1200&height=630&resize=cover&format=jpg&quality=85`;
  }

  return thumbnailUrl;
}
```

### Edição 2 — Extrair `whatsapp` do UA (após linha 100)

```typescript
const whatsapp = isWhatsApp(userAgent);
```

### Edição 3 — Atualizar todas as 4 chamadas a `buildHtml` para usar `getImageUrl`

- **Linha 114:** `image: DEFAULT_IMAGE` → `image: getImageUrl(null, whatsapp)`
- **Linha 152:** `image: DEFAULT_IMAGE` → `image: getImageUrl(null, whatsapp)`
- **Linha 175:** `image: getOgImageUrl(post.thumbnail_url)` → `image: getImageUrl(post.thumbnail_url, whatsapp)`
- **Linha 193:** `image: DEFAULT_IMAGE` → `image: getImageUrl(null, whatsapp)`

### Edição 4 — `og:image:type` dinâmico no `buildHtml`

Adicionar parâmetro `imageType` ao objeto `meta` do `buildHtml`:

```typescript
function buildHtml(meta: {
  title: string;
  description: string;
  image: string;
  url: string;
  author?: string;
  publishedTime?: string;
  imageType?: string;
}, isBot = false): string {
```

Linha 70: `content="image/webp"` → `content="${meta.imageType || 'image/webp'}"`

Nas chamadas com WhatsApp, passar `imageType: whatsapp ? 'image/jpeg' : 'image/webp'`.

## Não alterado
- Nenhum outro arquivo
- Banco / RLS
- index.html

