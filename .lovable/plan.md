

# Inteligencia de Conteudo -- Implementacao Completa

## Status Atual

Nenhum dos 7 itens do plano aprovado foi implementado. Este plano retoma a implementacao completa.

---

## Passo 1 -- Criar tabela `content_insights`

Migration SQL para criar a tabela com RLS restrito a admins/moderators.

```sql
CREATE TABLE public.content_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  sources_summary JSONB NOT NULL DEFAULT '{}',
  suggestions JSONB NOT NULL DEFAULT '[]',
  raw_analysis TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage content_insights"
  ON public.content_insights FOR ALL
  USING (is_admin_or_moderator(auth.uid()));
```

## Passo 2 -- Edge Function `content-intelligence`

Criar `supabase/functions/content-intelligence/index.ts` que:

1. Coleta dos ultimos 7 dias: `rag_query_logs`, `channel_posts`, `channel_post_comments` (com nome do canal via join)
2. Monta prompt para Gemini 3 Flash (via Lovable AI Gateway) pedindo analise de lacunas e sugestoes
3. Usa tool calling para extrair JSON estruturado com as sugestoes
4. Salva na tabela `content_insights`
5. Aceita chamada sem JWT (para CRON) -- `verify_jwt = false` no config.toml

## Passo 3 -- Hook React

Criar `src/hooks/useContentInsights.ts`:
- `useQuery` para listar relatorios ordenados por data
- `useMutation` para disparar geracao manual via `supabase.functions.invoke('content-intelligence')`
- Invalidacao de cache apos sucesso

## Passo 4 -- Pagina Admin

Criar `src/pages/admin/ContentIntelligence.tsx`:
- Header com titulo e botao "Gerar Relatorio Agora"
- Lista de relatorios em cards (periodo, data, resumo)
- Ao clicar, expande detalhes: metricas das fontes, sugestoes com badges de tipo e prioridade, queries de origem colapsaveis

## Passo 5 -- Rota e Navegacao

- Adicionar rota `/admin/intelligence` no `App.tsx` dentro do grupo admin com `AdminGuard`
- Adicionar item "Inteligencia" no `AdminSidebar.tsx` na secao "Conteudo" com icone `Lightbulb`

## Passo 6 -- CRON Semanal

Configurar via SQL (insert tool) o agendamento `pg_cron` para toda segunda-feira as 06:00 UTC.

---

## Arquivos a Criar/Alterar

| # | Arquivo | Acao |
|---|---|---|
| 1 | Migration SQL | Criar tabela + RLS |
| 2 | `supabase/functions/content-intelligence/index.ts` | Nova Edge Function |
| 3 | `src/hooks/useContentInsights.ts` | Novo hook |
| 4 | `src/pages/admin/ContentIntelligence.tsx` | Nova pagina |
| 5 | `src/App.tsx` | Adicionar rota |
| 6 | `src/components/admin/AdminSidebar.tsx` | Adicionar item nav |
| 7 | SQL (insert tool) | CRON semanal |

