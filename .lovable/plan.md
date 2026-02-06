
# Plano: Melhorias no Assistente de IA

## Problemas Identificados

1. **Podcasts não são consultados**: A função `ai-assistant` busca apenas `space_updates` (artigos) e `channel_posts` (discussões), mas **não consulta a tabela `podcasts`**.

2. **Links diretos não são fornecidos**: A IA não possui informações de URL para gerar links clicáveis para artigos e podcasts.

3. **Perfil do usuário não é acessado**: A IA não sabe o nome do usuário nem outras informações do perfil para personalizar respostas.

4. **Base de conhecimento incompleta**: A pergunta "O que a plataforma Subhumano oferece?" não menciona podcasts nem mentorias com o Expert Prof. Sandro Mesquita.

---

## Dados Confirmados

### Podcasts Publicados (existentes no banco):
| Título | Slug |
|--------|------|
| A Batalha dos Editores de IA em 2026... | `a-batalha-dos-editores-de-ia-em-2026-agilidade-do-cursor-vs-governanca-do-github` |
| O Evernote finalmente acordou... | `o-evernote-finalmente-acordou-ou-so-colocou-ia-em-cima-de-um-produto-antigo` |

### Estrutura de URLs:
- **Artigos**: `/spaces/{space_slug}/post/{post_slug}`
- **Podcasts**: `/podcasts/{podcast_slug}`
- **Canais**: `/channels/{channel_id}`

### Campos do Perfil Disponíveis:
`full_name`, `city`, `state`, `occupation_type`, `company_name`, `job_title`, `industry`, `skills`, `ai_experience_level`, `goals`, `bio`

---

## Implementação Proposta

### 1. Adicionar Busca de Podcasts

**Arquivo**: `supabase/functions/ai-assistant/index.ts`

Criar nova função `fetchRecentPodcasts`:

```text
Buscar últimos 15 podcasts publicados (30 dias)
Campos: id, title, slug, description, published_at, space (name, slug)
```

### 2. Adicionar Busca do Perfil do Usuário

**Arquivo**: `supabase/functions/ai-assistant/index.ts`

Criar função `fetchUserProfile` que recebe `userId` e retorna:

```text
full_name, city, state, occupation_type, job_title, 
company_name, industry, ai_experience_level, goals
```

### 3. Incluir Links nos Contextos

Modificar as funções de contexto para incluir URLs:

```text
ARTIGOS:
[Produtividade] "Evernote 11..." - 03/02/2026
Link: /spaces/produtividade/post/evernote-11-chega-com-ia...
Resumo: ...

PODCASTS:
🎙️ "A Batalha dos Editores de IA..." - 03/02/2026
Link: /podcasts/a-batalha-dos-editores-de-ia...
Descrição: ...
```

### 4. Personalizar Sistema com Contexto do Usuário

No prompt de sistema, incluir:

```text
=== CONTEXTO DO USUÁRIO ===
Nome: João Silva
Cidade: São Paulo, SP
Profissão: Desenvolvedor Full Stack na TechCorp
Nível de experiência com IA: Intermediário
Objetivos: Automatizar processos repetitivos

Use o nome do usuário nas respostas. Personalize recomendações.
```

### 5. Atualizar Instruções do Prompt

Adicionar ao `PLATFORM_STRUCTURE`:

```text
3. PODCASTS (/podcasts): Episódios de áudio sobre temas de IA
4. MENTORIAS: Sessões com Expert Prof. Sandro Mesquita

Quando o usuário pedir LINK de conteúdo:
- Forneça o link completo no formato Markdown: [Título](URL)
- URLs de artigos: /spaces/{space_slug}/post/{post_slug}
- URLs de podcasts: /podcasts/{podcast_slug}
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/ai-assistant/index.ts` | Adicionar `fetchRecentPodcasts`, `fetchUserProfile`, incluir links nos contextos, atualizar prompt |

---

## Código Detalhado

### Nova Interface `Podcast`:
```typescript
interface Podcast {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  published_at: string;
  spaces: { name: string; slug: string } | null;
}
```

### Nova Função `fetchRecentPodcasts`:
```typescript
async function fetchRecentPodcasts(db: any): Promise<Podcast[]> {
  const ago = new Date(); ago.setDate(ago.getDate() - 30);
  const { data } = await db
    .from("podcasts")
    .select("id, title, slug, description, published_at, spaces(name, slug)")
    .eq("is_published", true)
    .gte("published_at", ago.toISOString())
    .order("published_at", { ascending: false })
    .limit(15);
  return (data || []) as Podcast[];
}
```

### Nova Função `fetchUserProfile`:
```typescript
async function fetchUserProfile(db: any, userId: string): Promise<UserProfile | null> {
  const { data } = await db
    .from("profiles")
    .select("full_name, city, state, occupation_type, job_title, company_name, industry, ai_experience_level, goals")
    .eq("id", userId)
    .single();
  return data;
}
```

### Contexto de Podcasts com Links:
```typescript
function buildPodcastContext(podcasts: Podcast[]): string {
  if (!podcasts.length) return "";
  return "\n=== PODCASTS RECENTES ===\n" + 
    podcasts.map(p => {
      const date = new Date(p.published_at).toLocaleDateString("pt-BR");
      return `🎙️ "${p.title}" - ${date}\nLink: /podcasts/${p.slug}\n${p.description?.substring(0, 200)}...`;
    }).join("\n\n") + "\n";
}
```

### Contexto do Usuário:
```typescript
function buildUserContext(profile: UserProfile | null): string {
  if (!profile?.full_name) return "";
  let ctx = `\n=== CONTEXTO DO USUÁRIO ===\nNome: ${profile.full_name}`;
  if (profile.city && profile.state) ctx += `\nLocalização: ${profile.city}, ${profile.state}`;
  if (profile.job_title && profile.company_name) {
    ctx += `\nProfissão: ${profile.job_title} na ${profile.company_name}`;
  } else if (profile.occupation_type) {
    ctx += `\nOcupação: ${profile.occupation_type}`;
  }
  if (profile.ai_experience_level) ctx += `\nNível com IA: ${profile.ai_experience_level}`;
  if (profile.goals) ctx += `\nObjetivos: ${profile.goals}`;
  ctx += `\n\nIMPORTANTE: Chame o usuário pelo primeiro nome. Personalize recomendações.\n`;
  return ctx;
}
```

### Atualização do `PLATFORM_STRUCTURE`:
```typescript
const PLATFORM_STRUCTURE = `
=== ESTRUTURA DA PLATAFORMA SUBHUMANO ===

1. ESPAÇOS (/spaces): Conteúdo editorial dos administradores (artigos, tutoriais)
2. CANAIS (/channels): Fóruns da comunidade onde USUÁRIOS postam dúvidas e experiências
3. PODCASTS (/podcasts): Episódios de áudio com análises e debates sobre IA
4. MENTORIAS: Sessões ao vivo com o Expert Prof. Sandro Mesquita

REGRA: "fóruns/dúvidas" → CANAIS | "artigos/tutoriais" → ESPAÇOS | "áudio/episódios" → PODCASTS

LINKS: Quando o usuário pedir link de conteúdo específico, forneça no formato Markdown:
- Artigos: [Título](/spaces/{space_slug}/post/{post_slug})
- Podcasts: [Título](/podcasts/{podcast_slug})
`;
```

---

## Fluxo de Execução Atualizado

```text
Usuário envia mensagem
        ↓
ai-assistant recebe request
        ↓
Busca paralela:
  - RAG chunks (lexical)
  - Artigos recentes
  - Discussões recentes
  - Canais ativos
  - PODCASTS recentes  ← NOVO
  - PERFIL do usuário  ← NOVO
        ↓
Monta contexto com:
  - Estrutura da plataforma (inclui podcasts/mentorias)
  - RAG chunks
  - Canais
  - Artigos COM LINKS
  - Discussões
  - PODCASTS COM LINKS
  - PERFIL do usuário (nome, objetivos, etc.)
  - Regras anti-alucinação
        ↓
Envia para Lovable AI
        ↓
Stream resposta personalizada (com nome do usuário)
```

---

## Documento Adicional Necessário

Para que a IA responda corretamente sobre "O que a plataforma oferece?", **recomendo criar/atualizar um documento RAG** na camada `constituicao` ou `nucleo` com:

```markdown
---
title: "Produtos e Serviços do Subhumano"
layer: nucleo
priority: 90
tags: ["produtos", "servicos", "plataforma"]
---

# O que a plataforma Subhumano oferece

## Formatos de Conteúdo

### 1. Espaços (Artigos)
Conteúdo editorial curado sobre IA, organizado por temas:
- Produtividade Pessoal
- Marketing e Vendas
- Programação e Automação
- Audiovisual
- Estilo de Vida

### 2. Podcasts
Episódios de áudio com análises aprofundadas, debates e entrevistas sobre IA.
Duração média: 15-25 minutos.
Disponíveis em /podcasts.

### 3. Canais (Comunidade)
Fóruns temáticos onde assinantes podem:
- Trocar experiências
- Tirar dúvidas
- Compartilhar descobertas

### 4. Mentorias com Expert
Sessões ao vivo com o Prof. Sandro Mesquita, especialista em aplicações práticas de IA para negócios e produtividade.

## Planos Disponíveis
- Trial: 7 dias gratuitos
- Mensal: Acesso completo
- Anual: Acesso completo + canais premium
```

Você precisará adicionar este documento via `/admin/rag/documents` para que a IA tenha essa informação estruturada.

---

## Resultado Esperado

1. ✅ Perguntas sobre podcasts retornam títulos e links reais
2. ✅ Usuário pode pedir "me dá o link do artigo X" e receber link funcional
3. ✅ IA chama usuário pelo nome ("Olá João, ...")
4. ✅ Recomendações personalizadas com base no perfil
5. ✅ "O que a plataforma oferece?" menciona podcasts e mentorias
