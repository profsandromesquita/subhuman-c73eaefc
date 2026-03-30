

# Plano: Simplificar getOgImageUrl

## Arquivo: `supabase/functions/og-meta/index.ts`

### Edição única — linhas 28-43

**Antes:** Função com lógica de transformação Supabase render API + bloqueio de WebP (15 linhas)

**Depois:**
```typescript
function getOgImageUrl(thumbnailUrl: string | null): string {
  if (!thumbnailUrl || thumbnailUrl.trim() === '') {
    return DEFAULT_IMAGE;
  }
  return thumbnailUrl;
}
```

## Não alterado
- Nenhum outro arquivo
- Restante do og-meta/index.ts (bot detection, buildHtml, query, etc.)

