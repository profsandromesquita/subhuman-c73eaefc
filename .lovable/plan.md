

# Plano: Corrigir og-meta (service role key + default image)

## Arquivo: `supabase/functions/og-meta/index.ts`

### Edição 1 — Service Role Key (linha 75-78)
**Antes:** `Deno.env.get('SUPABASE_ANON_KEY')`
**Depois:** `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`

### Edição 2 — Logs de debug (após linha 73, antes da query)
Adicionar:
```typescript
console.log('og-meta request:', { spaceSlug, postSlug });
```
E após a query (linha 114):
```typescript
console.log('og-meta result:', { found: !!post, error: error?.message, title: (post as any)?.title });
```

### Edição 3 — DEFAULT_IMAGE (linha 12)
**Antes:** `` `${SITE_URL}/og-default.png` `` (404 — arquivo não existe)
**Depois:** `'https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/logo-subhumano.png?v=1'`

É o logo do Subhumano já usado nos emails. Não é o formato ideal 1200x630, mas é uma imagem real e pública. Pode ser substituída por uma imagem OG dedicada no futuro.

## Arquivo alterado
`supabase/functions/og-meta/index.ts` — 3 edits

