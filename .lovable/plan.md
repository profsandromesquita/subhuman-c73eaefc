

# Plano: Reduzir batch para 1 artigo no TTSBackfill

## Arquivo: `src/pages/admin/TTSBackfill.tsx`

### Edição 1
Linha com `body: JSON.stringify({ limit: 5 })` → `body: JSON.stringify({ limit: 1 })`

### Edição 2
Texto `Lotes de 5 artigos por vez` → `1 artigo processado por vez (evita timeout)`

Nenhum outro arquivo alterado.

