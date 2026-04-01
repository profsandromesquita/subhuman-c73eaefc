

# Plano: Remover `format=jpg` da Render API no og-meta

## Arquivo: `supabase/functions/og-meta/index.ts`

### Edição 1 — Linha 40
**Antes:** `+ '?width=1200&height=630&resize=cover&format=jpg&quality=90'`
**Depois:** `+ '?width=1200&height=630&resize=cover&quality=90'`

### Edição 2 — Linha 50
**Antes:** `` return `${renderUrl}?width=1200&height=630&resize=cover&format=jpg&quality=85`; ``
**Depois:** `` return `${renderUrl}?width=1200&height=630&resize=cover&quality=85`; ``

## Não alterado
- Detecção de bots e WhatsApp
- Meta tags OG
- Nenhum outro arquivo

