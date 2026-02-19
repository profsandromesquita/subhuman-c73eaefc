

# Inteligencia de Conteudo -- Agente Semanal de Sugestoes

## Resumo

Criar um sistema que analisa automaticamente (1) as perguntas dos usuarios no Assistente de IA (tabela `rag_query_logs`) e (2) os posts e comentarios dos 6 canais da comunidade, e gera semanalmente um relatorio com ideias de conteudos para Espacos, Canais, Podcasts e Cursos. O relatorio fica acessivel em uma nova pagina do painel administrativo.

---

## Fontes de Dados

Os dados ja existem no banco:

| Fonte | Tabela | Volume atual |
|---|---|---|
| Perguntas ao Assistente IA | `rag_query_logs` (query, intent, chunks_count) | 30 registros desde 05/02 |
| Posts dos Canais | `channel_posts` (content, title, channel_id) | ~31 posts nos ultimos 30 dias |
| Comentarios dos Canais | `channel_post_comments` (content, post_id) | Existente |
| Canais ativos | `channels` (6 canais: Geral, Duvidas, Networking, Projetos Premium, Ferramentas, Oportunidades) | 6 canais |

---

## Arquitetura

```text
+------------------+     +------------------------+     +-------------------+
| CRON Semanal     |---->| Edge Function           |---->| Tabela             |
| (pg_cron)        |     | content-intelligence   |     | content_insights   |
+------------------+     +------------------------+     +-------------------+
                              |                               |
                              | 1. Le rag_query_logs (7d)     |
                              | 2. Le channel_posts (7d)      |
                              | 3. Le channel_post_comments   |
                              | 4. Envia para LLM Gemini      |
                              | 5. Salva relatorio JSON        |
                              v                               v
                         +---------------------------+
                         | Admin: /admin/intelligence |
                         | Lista de relatorios        |
                         | Detalhes com sugestoes     |
                         +---------------------------+
```

---

## Plano de Implementacao

### Passo 1 -- Criar tabela `content_insights`

Nova tabela para armazenar os relatorios gerados semanalmente.

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

Estrutura do campo `suggestions` (array JSON):

```json
[
  {
    "title": "Tutorial: Como usar GPT-5.2 para programacao",
    "type": "espaco",
    "priority": "alta",
    "reasoning": "5 usuarios perguntaram sobre GPT-5.2 no assistente e 0 chunks foram encontrados",
    "suggested_space": "programacao-e-automacao",
    "source_queries": ["Quais as caracteristicas do chatgpt 5.2?", "E sobre o gpt-5.2?"],
    "source_channels": []
  }
]
```

Estrutura do campo `sources_summary`:

```json
{
  "total_queries": 15,
  "total_channel_posts": 22,
  "total_channel_comments": 45,
  "top_topics_queries": ["GPT-5.2", "ChatGPT", "automacao"],
  "top_channels_activity": [
    { "name": "Ferramentas", "posts": 11, "comments": 8 }
  ],
  "queries_without_answer": 8
}
```

### Passo 2 -- Criar Edge Function `content-intelligence`

Nova Edge Function em `supabase/functions/content-intelligence/index.ts` que:

1. **Coleta dados dos ultimos 7 dias:**
   - `rag_query_logs`: todas as queries, com destaque para as que retornaram `chunks_count = 0` (indicam lacunas no conteudo)
   - `channel_posts`: posts dos 6 canais com conteudo
   - `channel_post_comments`: comentarios nos posts dos canais

2. **Monta um prompt para o LLM** (Gemini 2.5 Flash via Lovable AI Gateway) com instrucoes para:
   - Identificar temas recorrentes nas perguntas dos usuarios
   - Identificar lacunas de conteudo (perguntas sem resposta = chunks_count 0)
   - Identificar tendencias nas discussoes dos canais
   - Sugerir entre 5 e 15 ideias de conteudo, cada uma com:
     - Titulo sugerido
     - Tipo: espaco (artigo), canal (post de discussao), podcast (episodio), ou curso
     - Prioridade: alta, media, baixa
     - Justificativa baseada nos dados
     - Espaco ou canal sugerido
     - Queries ou posts de origem

3. **Salva o resultado** na tabela `content_insights`

4. **Tambem permite execucao manual** via botao no admin (nao depende apenas do cron)

### Passo 3 -- Configurar CRON semanal

Agendar via `pg_cron` para executar toda segunda-feira as 06:00 UTC:

```sql
SELECT cron.schedule(
  'weekly-content-intelligence',
  '0 6 * * 1',
  $$
  SELECT net.http_post(
    url:='https://akkbfzfjappludgsrwsw.supabase.co/functions/v1/content-intelligence',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### Passo 4 -- Criar pagina Admin `/admin/intelligence`

Nova pagina `src/pages/admin/ContentIntelligence.tsx` com:

- **Header**: "Inteligencia de Conteudo" com descricao e botao "Gerar Relatorio Agora"
- **Lista de relatorios**: Cards com periodo, data de geracao e resumo
- **Detalhe do relatorio** (ao clicar):
  - Resumo das fontes (quantas queries, posts, comentarios analisados)
  - Perguntas mais frequentes sem resposta (lacunas)
  - Lista de sugestoes em cards com:
    - Badge do tipo (Espaco, Canal, Podcast, Curso)
    - Badge de prioridade (Alta em vermelho, Media em amarelo, Baixa em cinza)
    - Titulo sugerido
    - Justificativa
    - Queries/posts de origem colapsaveis

### Passo 5 -- Adicionar rota e navegacao

- Adicionar rota `/admin/intelligence` no `App.tsx` com `AdminGuard`
- Adicionar item "Inteligencia" no `AdminSidebar.tsx` na secao "Conteudo" com icone `Lightbulb` do Phosphor Icons

---

## Detalhes Tecnicos

### Edge Function -- Prompt do LLM

O prompt instruira o modelo a agir como um "Content Strategist" que analisa dados reais de engajamento e retorna JSON estruturado. O prompt inclui:

- As queries dos usuarios agrupadas por tema
- Destaque para queries com `chunks_count = 0` (sem resposta)
- Posts e comentarios dos canais resumidos por canal
- Os 5 espacos existentes como opcoes de destino
- Os 6 canais como opcoes de destino
- Instrucao para retornar um array JSON com o schema definido

### Seguranca

- A Edge Function valida o JWT (admin/moderator) para execucao manual
- Para execucao via CRON, aceita chamada com anon key (sem JWT)
- A tabela `content_insights` tem RLS restrito a admin/moderator

### Hook React

Criar `src/hooks/useContentInsights.ts` com:
- `useQuery` para listar relatorios
- `useMutation` para gerar relatorio manual
- Invalidacao de cache apos geracao

---

## Arquivos Criados/Alterados

| # | Arquivo | Acao |
|---|---|---|
| 1 | Migration SQL | Criar tabela `content_insights` + RLS |
| 2 | `supabase/functions/content-intelligence/index.ts` | Nova Edge Function |
| 3 | `supabase/config.toml` | Registrar `content-intelligence` com `verify_jwt = false` |
| 4 | SQL (insert tool) | Configurar pg_cron semanal |
| 5 | `src/hooks/useContentInsights.ts` | Novo hook |
| 6 | `src/pages/admin/ContentIntelligence.tsx` | Nova pagina admin |
| 7 | `src/App.tsx` | Adicionar rota `/admin/intelligence` |
| 8 | `src/components/admin/AdminSidebar.tsx` | Adicionar item "Inteligencia" |

