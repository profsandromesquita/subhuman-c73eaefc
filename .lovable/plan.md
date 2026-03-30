

# Plano: Converter WebP para JPEG via Supabase Image Transform

## Arquivo único: `supabase/functions/og-meta/index.ts`

### Edição 1 — Adicionar função `getOgImageUrl()` (após linha 38, antes de `buildHtml`)

```typescript
function getOgImageUrl(thumbnailUrl: string | null): string {
  if (!thumbnailUrl) return DEFAULT_IMAGE;

  if (thumbnailUrl.includes('/storage/v1/object/public/')) {
    const renderUrl = thumbnailUrl
      .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
      .split('?')[0];
    return `${renderUrl}?width=1200&height=630&resize=cover&format=jpg&quality=85`;
  }

  if (thumbnailUrl.toLowerCase().endsWith('.webp')) {
    return DEFAULT_IMAGE;
  }

  return thumbnailUrl;
}
```

### Edição 2 — Substituir IIFE de imagem por `getOgImageUrl()` (linhas 168-174)

**Antes:**
```typescript
image: (() => {
  const thumb = post.thumbnail_url ?? '';
  if (thumb.toLowerCase().endsWith('.webp') || !thumb) {
    return DEFAULT_IMAGE;
  }
  return thumb;
})(),
```

**Depois:**
```typescript
image: getOgImageUrl(post.thumbnail_url),
```

### Edição 3 — Atualizar `og:image:type` para JPEG (linha 63)

**Antes:** `content="image/png"`
**Depois:** Condicional não é possível sem refactor do `buildHtml`. Trocar para `content="image/jpeg"` pois a maioria dos artigos terá thumbnail convertida para JPEG. O fallback (logo PNG) funciona igualmente — redes sociais não validam estritamente o `og:image:type`.

## Não alterado
- Nenhum outro arquivo
- Banco / RLS
- Lógica de bot detection, buildHtml, ou fallbacks de erro

