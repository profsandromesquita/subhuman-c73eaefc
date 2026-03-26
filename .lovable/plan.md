

# Plano: Backfill com lotes + página admin TTSBackfill

## Resumo

2 arquivos alterados, 1 arquivo criado, 1 rota adicionada.

## 1. `supabase/functions/tts-backfill/index.ts` — reescrita

Adicionar suporte a `limit` no body (default 5), `.limit(limit)` na query, e contagem de `remaining` no response. Estrutura do response muda para incluir `remaining`.

## 2. `src/pages/admin/TTSBackfill.tsx` — novo

Página com loop automático que chama `/tts-backfill` em lotes de 5 até `remaining === 0`. Mostra progresso em tempo real (sucesso/falha/restantes), timer, e lista de erros. Usa `supabase.auth.getSession()` para JWT.

## 3. `src/App.tsx` — adicionar rota

- Lazy import: `const TTSBackfill = lazy(() => import("./pages/admin/TTSBackfill"));`
- Rota: `<Route path="/admin/tts-backfill" element={<AdminGuard requireAdmin><TTSBackfill /></AdminGuard>} />`
- Protegida por `AdminGuard requireAdmin` (só admins)

## Arquivos

1. `supabase/functions/tts-backfill/index.ts` — reescrita completa
2. `src/pages/admin/TTSBackfill.tsx` — novo
3. `src/App.tsx` — 2 linhas (import + rota)

