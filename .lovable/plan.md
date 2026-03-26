

# Plano: 4 correções cirúrgicas no TTS

## 1. `supabase/functions/tts-generate/index.ts`

### Correção 1 — Linha 5
`tts-1-hd` → `tts-1`

### Correção 2 — Linhas 45-52
Substituir bloco `getClaims` por `getUser()` + `console.error`:
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  console.error('Auth failed:', authError?.message ?? 'no user');
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```
Nota: `getUser()` usa o header Authorization já passado ao client — não precisa de `token` manual. A linha 45 (`const token = ...`) é removida.

## 2. `src/hooks/useArticleTTS.ts`

### Correção 3 — Linha 23
`20000` → `30000`

### Correção 4 — Linhas 224-225
Substituir:
```typescript
const fullText = blocks.join(' ');
chunksRef.current = splitIntoChunks(fullText);
```
Por:
```typescript
chunksRef.current = blocks;
```

## Arquivos alterados
1. `supabase/functions/tts-generate/index.ts` — 2 edits (model + auth)
2. `src/hooks/useArticleTTS.ts` — 2 edits (timeout + chunking)

