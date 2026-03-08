

# Plano: Corrigir exibição de curtidas e comentários na página Início

## Diagnóstico

Após investigação detalhada, identifiquei a causa raiz: as views `space_update_stats` e `channel_post_stats` foram criadas com `security_invoker=on`. Isso força o PostgREST a executar as queries internas da view com o contexto RLS do usuário chamador. Em certas condições de sessão (token expirado parcialmente, cache do PostgREST, role mismatch), o resultado pode vir vazio — fazendo com que `statsMap` fique sem entradas e todos os contadores mostrem `0`.

**Evidência**: Os dados existem no banco (confirmado via queries diretas), mas a view com `security_invoker=on` introduz uma camada de RLS desnecessária para dados que são públicos (contagens de curtidas e comentários).

## Correção

### 1. Migração SQL — Remover `security_invoker` das views

Recriar as duas views **sem** `security_invoker=on`. Como as views apenas agregam contagens de tabelas públicas (likes/comments com SELECT `USING (true)`), não há risco de segurança em executá-las como o owner (postgres).

```sql
-- Recriar space_update_stats sem security_invoker
CREATE OR REPLACE VIEW public.space_update_stats AS
SELECT su.id AS update_id,
  COALESCE(l.likes_count, 0) AS likes_count,
  COALESCE(c.comments_count, 0) AS comments_count
FROM space_updates su
LEFT JOIN (SELECT update_id, count(*) AS likes_count FROM update_likes GROUP BY update_id) l ON l.update_id = su.id
LEFT JOIN (SELECT update_id, count(*) AS comments_count FROM update_comments GROUP BY update_id) c ON c.update_id = su.id;

-- Recriar channel_post_stats sem security_invoker
CREATE OR REPLACE VIEW public.channel_post_stats AS
SELECT cp.id AS post_id,
  COALESCE(l.likes_count, 0) AS likes_count,
  COALESCE(c.comments_count, 0) AS comments_count
FROM channel_posts cp
LEFT JOIN (SELECT post_id, count(*) AS likes_count FROM channel_post_likes GROUP BY post_id) l ON l.post_id = cp.id
LEFT JOIN (SELECT post_id, count(*) AS comments_count FROM channel_post_comments GROUP BY post_id) c ON c.post_id = cp.id;
```

### 2. Nenhuma alteração de código necessária

Os hooks (`useHighlights`, `useRecentHighlights`, `useRecentDiscussions`, `useRecentDiscussionsChronological`) já buscam as views corretamente. A correção é puramente no banco.

| Alteração | Tipo |
|---|---|
| Migração SQL: recriar 2 views sem `security_invoker` | Banco de dados |
| Código frontend | Nenhuma alteração |

### Risco
Baixo. As views apenas agregam dados de tabelas cujas políticas SELECT já são `USING (true)`. Remover `security_invoker` garante que as contagens sempre funcionem independentemente do contexto de autenticação.

