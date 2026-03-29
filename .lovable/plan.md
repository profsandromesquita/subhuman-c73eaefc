

# Plano: Corrigir og-meta (remover profiles join + UTF-8)

## Arquivo: `supabase/functions/og-meta/index.ts`

### Edição 1 — Remover profiles do select (linhas 102-116)

**Antes:**
```typescript
const { data: post, error } = await supabase
  .from('space_updates')
  .select(`
    title,
    slug,
    thumbnail_url,
    content,
    published_at,
    spaces!inner ( slug, name ),
    profiles ( full_name )
  `)
```

**Depois:**
```typescript
const { data: post, error } = await supabase
  .from('space_updates')
  .select(`
    title,
    slug,
    thumbnail_url,
    content,
    published_at,
    author_id,
    spaces!inner ( slug, name )
  `)
```

### Edição 2 — Remover author do buildHtml call (linha 151)

**Antes:**
```typescript
author: (post.profiles as any)?.full_name ?? undefined,
```

**Depois:** linha removida.

### Edição 3 — Adicionar Content-Type meta ao HTML (linha 43-44)

**Antes:**
```html
<meta charset="UTF-8" />
<title>...
```

**Depois:**
```html
<meta charset="UTF-8" />
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>...
```

## Resumo

3 edições cirúrgicas no mesmo arquivo. Remove o join problemático com `profiles` que causa erro de schema cache, e adiciona declaração explícita de charset no HTML para corrigir caracteres UTF-8 quebrados.

