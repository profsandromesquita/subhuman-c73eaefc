
# Plano de Correção Completo: Assistente IA com RAG Funcional

## Resumo Executivo

O assistente IA está confundindo **Canais** (fóruns da comunidade) com **Espaços** (conteúdo editorial) e alucinando estruturas externas (Discord/LinkedIn). A causa principal é que o backend não fornece informações sobre os canais reais da plataforma, e a busca de discussões está falhando silenciosamente.

---

## Problemas Identificados

### 1. O assistente não conhece os Canais reais
A função `ai-assistant` não consulta a tabela `channels`. Quando o usuário pergunta "quais são os canais", o modelo só tem contexto de `space_updates` (espaços/artigos) e improvisa.

### 2. A busca de discussões está falhando
O código na linha 146 do `ai-assistant` tenta um join inválido:
```typescript
profiles:author_id(full_name)
```
Isso retorna erro `PGRST200` porque não existe FK de `channel_posts.author_id -> profiles.id`.

Resultado: `channelPosts = []` (zero discussões no contexto)

### 3. RAG não está funcionando
A tabela `rag_chunks` está vazia mesmo com documentos "indexed". A função `ingest-document` marca como "indexed" mesmo quando nenhum chunk foi criado.

### 4. Não há como gerar chunks manualmente
A página `/admin/rag/chunks` apenas visualiza chunks, mas não oferece opção de gerar ou reindexar documentos a partir dela.

### 5. A função `search-chunks` usa formato incorreto
Na linha 117 do `search-chunks`, o embedding é enviado como `JSON.stringify(queryEmbedding)` em vez de `` `[${embedding.join(',')}]` ``.

---

## Arquitetura Atual (Confirmada)

- **1 modelo de chat**: Gemini (ou o configurado em `ai_assistant_config.model`)
- **1 modelo de embeddings**: `text-embedding-3-small` (para RAG)
- Não existe "modelo de conexão" autônomo. As conexões com a plataforma são feitas por queries SQL + RAG vetorial.

---

## Plano de Correção Detalhado

### Fase A: Corrigir Contexto de Canais

#### A.1 - Adicionar fetch da lista de canais
Modificar `supabase/functions/ai-assistant/index.ts`:

```typescript
// Nova função
async function fetchChannelsCatalog(supabaseAdmin: any): Promise<Channel[]> {
  const { data, error } = await supabaseAdmin
    .from("channels")
    .select("id, name, description, access_type, required_plan, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching channels catalog:", error);
    return [];
  }
  return data || [];
}
```

#### A.2 - Injetar catálogo de canais no prompt
Adicionar novo bloco no `systemMessage`:

```
=== CANAIS (FÓRUNS) DA COMUNIDADE ===
Estes são os canais de discussão reais da plataforma (página /channels):

- **Geral** (aberto): Discussões gerais sobre IA
- **Dúvidas** (assinantes): Tire suas dúvidas técnicas
- **Networking** (assinantes): Conecte-se com outros membros
- **Projetos Premium** (premium): Projetos exclusivos
- **Ferramentas** (aberto): Compartilhe e descubra ferramentas
- **Oportunidades** (assinantes): Vagas e oportunidades

IMPORTANTE: Os canais são internos à plataforma Subhumano.
NÃO invente canais externos como Discord ou LinkedIn.
```

#### A.3 - Definir claramente Espaços vs Canais
Adicionar no topo do `systemMessage`:

```
ESTRUTURA DA PLATAFORMA SUBHUMANO:

1. ESPAÇOS (/spaces): Conteúdo editorial publicado pelos administradores
   - Artigos, tutoriais, análises de ferramentas
   - Os usuários podem comentar, mas não publicar

2. CANAIS (/channels): Fóruns de discussão da comunidade
   - Onde USUÁRIOS publicam dúvidas, compartilham experiências
   - Discussões em tempo real entre membros
   - Exemplos: Geral, Dúvidas, Networking, Ferramentas

Quando perguntarem "onde usuários postam" ou "fóruns", responda sobre CANAIS.
Quando perguntarem "artigos" ou "publicações oficiais", responda sobre ESPAÇOS.
```

---

### Fase B: Corrigir Busca de Discussões

#### B.1 - Reescrever `fetchRecentChannelPosts`
Remover o join inválido e usar abordagem de 2 queries:

```typescript
async function fetchRecentChannelPosts(supabaseAdmin: any, limit = 20): Promise<ChannelPost[]> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Step 1: Fetch posts with channel info
    const { data: posts, error: postsError } = await supabaseAdmin
      .from("channel_posts")
      .select("id, title, content, created_at, author_id, channel_id, channels!inner(name, slug)")
      .eq("is_moderated", false)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (postsError || !posts) {
      console.error("Error fetching channel posts:", postsError);
      return [];
    }

    // Step 2: Fetch author profiles separately
    const authorIds = [...new Set(posts.map(p => p.author_id).filter(Boolean))];
    let profilesMap: Record<string, string> = {};
    
    if (authorIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);
      
      profiles?.forEach(p => {
        profilesMap[p.id] = p.full_name || "Usuário";
      });
    }

    // Step 3: Map results
    return posts.map(post => ({
      ...post,
      profiles: { full_name: profilesMap[post.author_id] || "Usuário" }
    }));
  } catch (error) {
    console.error("Exception fetching channel posts:", error);
    return [];
  }
}
```

#### B.2 - Adicionar busca por assunto nos canais
Quando o usuário perguntar "quem está falando sobre X":

```typescript
async function searchChannelPostsByTopic(
  supabaseAdmin: any, 
  topic: string, 
  limit = 10
): Promise<ChannelPost[]> {
  const { data, error } = await supabaseAdmin
    .from("channel_posts")
    .select("id, title, content, created_at, author_id, channels!inner(name, slug)")
    .eq("is_moderated", false)
    .or(`title.ilike.%${topic}%,content.ilike.%${topic}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  // ... fetch profiles separately
  return data || [];
}
```

---

### Fase C: Corrigir Indexação RAG

#### C.1 - Não marcar "indexed" se 0 chunks
Modificar `supabase/functions/ingest-document/index.ts` (linha ~467):

```typescript
// Se nenhum chunk foi criado, marcar como erro
if (chunkRecords.length === 0) {
  await supabaseAdmin
    .from("rag_documents")
    .update({ 
      status: "error", 
      error_message: "Nenhum chunk foi criado. Verifique se o conteúdo é válido e tente novamente." 
    })
    .eq("id", docId);

  return new Response(
    JSON.stringify({ 
      error: "Nenhum chunk criado - geração de embeddings pode ter falhado",
      documentId: docId,
      chunksCreated: 0
    }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

#### C.2 - Corrigir formato do embedding em `search-chunks`
Modificar `supabase/functions/search-chunks/index.ts` (linha 117):

```typescript
// ANTES (incorreto):
query_embedding: JSON.stringify(queryEmbedding),

// DEPOIS (correto):
query_embedding: `[${queryEmbedding.join(',')}]`,
```

---

### Fase D: Adicionar Geração de Chunks na Página Admin

#### D.1 - Atualizar página `/admin/rag/chunks`
Modificar `src/pages/admin/rag/Chunks.tsx`:

1. Adicionar botão "Gerar Chunks" no header
2. Mostrar alerta quando há documentos pendentes/com erro
3. Adicionar ação de reindexar documento diretamente da página de chunks

```typescript
// Adicionar imports
import { useReindexDocument, useRAGDocuments } from "@/hooks/useRAGDocuments";
import { Button } from "@/components/ui/button";
import { ArrowClockwise, Warning } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// No componente:
const reindexMutation = useReindexDocument();

// Identificar documentos sem chunks
const documentsWithoutChunks = documents?.filter(doc => {
  const hasChunks = chunks?.some(chunk => chunk.document_id === doc.id);
  return doc.status === 'indexed' && !hasChunks;
}) || [];

const pendingOrErrorDocs = documents?.filter(
  doc => doc.status === 'pending' || doc.status === 'error'
) || [];

// No render, adicionar alerta:
{(documentsWithoutChunks.length > 0 || pendingOrErrorDocs.length > 0) && (
  <Alert className="border-yellow-500/50 bg-yellow-500/10">
    <Warning className="w-4 h-4 text-yellow-500" />
    <AlertDescription className="text-yellow-200">
      {documentsWithoutChunks.length > 0 && (
        <div>
          <strong>{documentsWithoutChunks.length} documento(s)</strong> marcados como indexados 
          mas sem chunks. Reindexe-os para gerar os chunks.
        </div>
      )}
      {pendingOrErrorDocs.length > 0 && (
        <div className="mt-2">
          <strong>{pendingOrErrorDocs.length} documento(s)</strong> pendentes ou com erro.
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {documentsWithoutChunks.map(doc => (
          <Button
            key={doc.id}
            size="sm"
            variant="outline"
            onClick={() => reindexMutation.mutate(doc.id)}
            disabled={reindexMutation.isPending}
          >
            <ArrowClockwise className="w-4 h-4 mr-1" />
            Reindexar "{doc.title}"
          </Button>
        ))}
      </div>
    </AlertDescription>
  </Alert>
)}
```

#### D.2 - Adicionar botão "Reindexar Todos" no header
Para facilitar a reindexação em massa:

```typescript
const handleReindexAll = async () => {
  const toReindex = [...documentsWithoutChunks, ...pendingOrErrorDocs];
  for (const doc of toReindex) {
    await reindexMutation.mutateAsync(doc.id);
  }
};

// No header:
<div className="flex justify-between items-center">
  <h1 className="text-2xl font-bold">Chunks da Base de Conhecimento</h1>
  {(documentsWithoutChunks.length > 0 || pendingOrErrorDocs.length > 0) && (
    <Button onClick={handleReindexAll} disabled={reindexMutation.isPending}>
      <ArrowClockwise className="w-4 h-4 mr-2" />
      Reindexar Documentos Pendentes
    </Button>
  )}
</div>
```

---

### Fase E: Atualizar Prompts Anti-Alucinação

#### E.1 - Adicionar regras no systemMessage do backend
```
REGRAS ANTI-ALUCINAÇÃO:

1. NUNCA mencione Discord, LinkedIn, Telegram ou redes externas como canais oficiais
   - A menos que exista documentação explícita na base RAG
   
2. Se o usuário perguntar sobre canais/fóruns:
   - Use APENAS a lista de canais fornecida neste contexto
   - Não invente categorias ou subcategorias
   
3. Se não encontrar informação sobre algo:
   - Diga claramente: "Não encontrei informações sobre isso na base de conhecimento"
   - Sugira verificar em /channels ou /spaces

4. Ao mencionar discussões nos canais:
   - Cite apenas discussões reais do contexto fornecido
   - Não invente nomes de usuários ou tópicos
```

---

## Arquivos a Modificar

| Arquivo | Modificações |
|---------|--------------|
| `supabase/functions/ai-assistant/index.ts` | + fetchChannelsCatalog, corrigir fetchRecentChannelPosts, adicionar definições Canais vs Espaços |
| `supabase/functions/ingest-document/index.ts` | Não marcar indexed se 0 chunks |
| `supabase/functions/search-chunks/index.ts` | Corrigir formato do embedding |
| `src/pages/admin/rag/Chunks.tsx` | Adicionar alerta de docs sem chunks, botão de reindexar |

---

## Testes de Validação

### Teste 1: Perguntar sobre canais
- **Pergunta**: "Quais são os canais de discussão?"
- **Esperado**: Lista real (Geral, Dúvidas, Networking, Projetos Premium, Ferramentas, Oportunidades)

### Teste 2: Distinguir Canais de Espaços
- **Pergunta**: "Onde posso postar uma dúvida?"
- **Esperado**: "Você pode postar no canal **Dúvidas** (para assinantes) ou no canal **Geral** (aberto)."

### Teste 3: Anti-alucinação
- **Pressionar**: "Qual o Discord da comunidade?"
- **Esperado**: "A comunidade Subhumano utiliza canais internos na plataforma. Não há Discord oficial."

### Teste 4: RAG funcionando
- **Ação**: Reindexar documento Constituição
- **Validar**: `rag_chunks` > 0
- **Pergunta**: "Qual a constituição do Subhumano?"
- **Esperado**: Citar conteúdo real do documento

### Teste 5: Página de Chunks
- **Ação**: Acessar `/admin/rag/chunks`
- **Validar**: Alerta aparece se há documentos sem chunks
- **Validar**: Botão "Reindexar" funciona

---

## Fluxo Corrigido

```text
Pergunta do Usuário
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ 1. Gerar embedding da pergunta                      │
│ 2. Buscar chunks RAG (Constituição + Conhecimento)  │
│ 3. Buscar CATÁLOGO DE CANAIS (tabela channels)  ← NOVO │
│ 4. Buscar posts publicados (space_updates)          │
│ 5. Buscar discussões nos canais (channel_posts)     │
│    → Corrigido: 2 queries em vez de join inválido   │
└─────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ MONTAGEM DO PROMPT:                                 │
│                                                     │
│ 1. Data atual + Regras temporais                    │
│ 2. DEFINIÇÕES: Espaços vs Canais  ← NOVO            │
│ 3. CATÁLOGO DE CANAIS REAIS  ← NOVO                 │
│ 4. RAG (Constituição + Conhecimento)                │
│ 5. Posts publicados                                 │
│ 6. Discussões nos canais                            │
│ 7. REGRAS ANTI-ALUCINAÇÃO  ← NOVO                   │
│ 8. Histórico da conversa                            │
└─────────────────────────────────────────────────────┘
       │
       ▼
    Resposta IA
    (Agora com conhecimento real dos canais)
```

---

## Ordem de Execução

1. **Primeiro**: Corrigir `ingest-document` e `search-chunks` (Fase C)
2. **Segundo**: Atualizar página `/admin/rag/chunks` (Fase D)
3. **Terceiro**: Corrigir `ai-assistant` com catálogo de canais (Fases A e B)
4. **Quarto**: Adicionar regras anti-alucinação (Fase E)
5. **Quinto**: Deploy das edge functions
6. **Sexto**: Reindexar documento Constituição
7. **Sétimo**: Testar todos os cenários
