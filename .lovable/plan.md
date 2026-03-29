

# Plano: Fallback de WebP para PNG no og-meta

## Arquivo: `supabase/functions/og-meta/index.ts`

### Edição única — linha 153

**Antes:**
```typescript
image: post.thumbnail_url ?? DEFAULT_IMAGE,
```

**Depois:**
```typescript
image: (() => {
  const thumb = post.thumbnail_url ?? '';
  if (thumb.toLowerCase().endsWith('.webp') || !thumb) {
    return DEFAULT_IMAGE;
  }
  return thumb;
})(),
```

`DEFAULT_IMAGE` (linha 12) já aponta para o PNG público correto. `og:image:type` (linha 51) já está presente como `image/png`. Nenhuma outra edição necessária.

## Não alterado

- Nenhum outro arquivo
- Banco / RLS
- Outras Edge Functions

