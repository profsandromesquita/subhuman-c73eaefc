
## Diagnóstico (causa raiz confirmada pelos logs)

Pelos logs da função `ingest-document` (e pela imagem), o problema não está no “momento de criação” dos chunks, e sim na etapa de **gerar embeddings** (vetores) para cada chunk.

Hoje o fluxo do indexador é:

1) Insere/atualiza o documento (`rag_documents`) com status `processing`  
2) Faz o chunking do texto (gera 8 chunks, por exemplo)  
3) Para cada chunk, chama o endpoint de embeddings no gateway de IA  
4) Se conseguir embeddings, insere em `rag_chunks` e marca o documento como `indexed`

O erro acontece no passo **3**. O log mostra explicitamente:

- `Embedding API error: 400 ... invalid model: text-embedding-3-small, allowed models: [openai/gpt-5-mini ... google/gemini-...]`
- Em seguida: `Failed to generate embedding for chunk X`
- Resultado final: `Attempting to insert 0 chunks...` e `No chunks were created...`
- A função retorna 400 com: `Nenhum chunk criado - geração de embeddings pode ter falhado`

Ou seja: **os chunks (texto) até são gerados**, mas **nenhum chunk “vira registro”** porque **sem embedding o código descarta o chunk** e não insere nada.

### Causa técnica mais provável
O gateway de IA está rejeitando o modelo `"text-embedding-3-small"` porque ele exige o nome completo com prefixo do provedor, no mesmo padrão dos modelos de chat exibidos no erro (`openai/...` e `google/...`).

A correção mais provável e consistente com o erro é trocar:

- `text-embedding-3-small`
por:
- `openai/text-embedding-3-small`

Se mesmo assim falhar, então o gateway **não está oferecendo embeddings** (ou está em rota diferente), e precisaremos de um fallback definitivo (ver “Plano B” abaixo). Mas, pelo padrão do erro, a chance maior é ser apenas o nome do modelo.

---

## Plano de correção definitivo (o que vou mudar)

### 1) Corrigir o nome do modelo de embeddings em TODAS as funções que geram embedding
**Arquivos:**
- `supabase/functions/ingest-document/index.ts`
- `supabase/functions/search-chunks/index.ts`
- `supabase/functions/ai-assistant/index.ts`

**Mudança:**
- Atualizar `generateEmbedding()` para usar `model: "openai/text-embedding-3-small"` (em vez de `"text-embedding-3-small"`)

**Por que isso é definitivo:**
- Elimina o erro “invalid model” que impede a criação de qualquer chunk.
- Mantém a dimensionalidade esperada (1536) compatível com a coluna `embedding` (pgvector).

---

### 2) Adicionar “preflight” (checagem rápida) antes de destruir o que já existe
Hoje, ao reindexar (`documentId`), a função:
- marca `processing`
- apaga chunks existentes
- tenta gerar embeddings
- se falhar, você fica com **0 chunks** e documento em `error`

**Mudança:**
- Antes de deletar chunks existentes, fazer uma chamada de teste:
  - gerar embedding de um texto curto (ex: `"ping"`) ou do primeiro chunk
- Se falhar:
  - **não deletar chunks antigos**
  - retornar erro com detalhe
  - manter documento como `error` ou reverter status (dependendo do caso)

**Resultado:**
- Você nunca mais perde uma base indexada por uma falha momentânea de embeddings.

---

### 3) Retornar mensagem de erro útil para o Admin (sem “erro genérico”)
Hoje a função loga o erro do gateway, mas a UI recebe apenas “Nenhum chunk criado...”.

**Mudança:**
- Incluir no JSON de erro retornado:
  - status code do gateway
  - trecho do `errorText` retornado pelo gateway
  - modelo usado
- Isso permite diagnosticar rápido (ex: “modelo inválido”, “créditos”, “rate limit”, etc.) sem tentativa-e-erro.

---

### 4) Corrigir o erro “Unhandled Promise Rejection” na UI de documentos
Na sua imagem aparece:
- `Unhandled Promise Rejection: Error: Nenhum chunk criado...`

Isso ocorre porque `handleSubmit` faz `await ingestMutation.mutateAsync(content)` sem `try/catch`. Quando a função retorna 400, o erro vira “promessa rejeitada” e polui o console.

**Arquivo:**
- `src/pages/admin/rag/Documents.tsx`

**Mudança:**
- Envolver `handleSubmit` em `try/catch`
- Em caso de erro:
  - manter o diálogo aberto
  - exibir toast amigável com a mensagem detalhada vinda do backend

Isso não resolve embeddings, mas evita “efeito cascata” de erros no navegador e melhora o feedback para você.

---

## Plano B (fallback definitivo se o gateway não suportar embeddings)
Se após trocar para `openai/text-embedding-3-small` o gateway continuar sem aceitar embeddings, aí a causa raiz muda para: “gateway não fornece embeddings”.

Nesse cenário, para não ficar travado, eu implemento um fallback que garante indexação e busca:

1) **Indexação sem embeddings**:
- Inserir chunks mesmo com `embedding = null`
- Marcar documento como `indexed_lexical` (ou manter `indexed` mas com flag em metadata)

2) **Busca lexical (sem vetores)**:
- Atualizar `search-chunks` para:
  - quando não houver embeddings disponíveis, usar busca por texto (ILIKE / tsvector)
  - respeitar `layer`, `tags` e `priority`

Isso exigirá ajustes no backend e possivelmente uma pequena alteração/novo RPC (via migração) para busca textual performática. Só aplico este Plano B se o Plano A falhar após teste.

---

## Como vou validar que foi corrigido (checklist objetivo)

1) Rodar indexação da Constituição
2) Ver no log do `ingest-document`:
   - não aparecer mais `invalid model`
   - aparecer `Generated embedding with 1536 dimensions`
   - `Successfully inserted X chunks`
3) Em `/admin/rag/chunks`:
   - Constituição listada com chunks
4) Em `/ai-assistant`:
   - perguntar sobre regras/identidade
   - resposta deve citar conteúdo real da Constituição (RAG funcionando)

---

## Entregáveis (mudanças que você verá)

- Indexação deixa de retornar 400 por “invalid model”
- Constituição passa a gerar chunks de fato
- Reindex não apaga chunks antigos se embeddings falhar
- UI não gera mais “Unhandled Promise Rejection” e mostra erro detalhado

---

## Observação importante sobre sua pergunta (“chunks não deveriam vir após inserir documento?”)
Sim, eles vêm depois. O que está acontecendo é:
- o documento é inserido
- os chunks de texto são gerados
- mas **nenhum chunk é persistido** porque a etapa seguinte (embedding) falha e o código descarta o chunk sem embedding

A correção do modelo (Plano A) ataca exatamente esse ponto.

