

# Plano: Indexação automática de artigos no RAG

## Resumo

5 partes, 3 arquivos alterados/criados. A Edge Function `index-article-rag` centraliza toda a lógica. O frontend dispara a indexação na publicação/edição e oferece botão de backfill.

---

## Parte 1 — Edge Function `supabase/functions/index-article-rag/index.ts`

Nova Edge Function com ~250 linhas. Usa **Opção B** (copiar lógica de chunking) para não tocar em `generate-chunks`.

**Endpoints:**
- `POST { article_id }` — indexa um artigo específico
- `POST { action: "backfill" }` — indexa todos os artigos publicados sem documento RAG

**Fluxo para artigo individual:**
1. Auth JWT + verificação admin/moderator via `user_roles`
2. Busca artigo em `space_updates` com join `spaces!inner(name, slug)`, valida `is_published = true`
3. Busca `rag_documents` com filtro `metadata->>'article_id' = article_id`
4. Se existe: atualiza `source_content`, deleta chunks antigos, recria
5. Se não existe: insere novo `rag_document` com layer `biblioteca`, priority `65`, metadata `{ source_type: "article", article_id, space_id, space_slug, published_at }`
6. Gera `source_content` com cabeçalho formatado + HTML stripado
7. Gera chunks (cópia da lógica `chunkContent` + `extractAutoTags` de `generate-chunks`)
8. Insere chunks em `rag_chunks`, seta status `indexed`

**Fluxo backfill:**
1. Busca todos artigos `is_published = true`
2. Para cada, verifica se já tem `rag_document` (via query batch de todos os documents com `metadata->>'source_type' = 'article'`)
3. Pula existentes, indexa novos
4. Retorna `{ indexed, skipped, errors }`

**Tags:** `["artigo", "{space_slug}", ...palavras do título]` limitadas a 8.

---

## Parte 2 — Integração na publicação (`src/pages/admin/SpaceContent.tsx`)

### 2.1 — Nova função `indexArticleRAG`

```typescript
async function indexArticleRAG(articleId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/index-article-rag`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: articleId }),
    });
  } catch (err) {
    console.error('RAG indexing error:', err);
  }
}
```

### 2.2 — Chamada em `handleSave` (linha 188-190)

Após `generateArticleAudio`, adicionar:
```typescript
if (publish && updateId) {
  generateArticleAudio(updateId, formData.content);
  indexArticleRAG(updateId);  // NOVO
}
```

### 2.3 — Chamada em `handlePublish` (linha 236-238)

Após `generateArticleAudio`, adicionar:
```typescript
indexArticleRAG(update.id);  // NOVO
```

### 2.4 — Re-indexação na edição (dentro de `handleSave`, bloco de edição, ~linha 173)

Quando `editingUpdate` e o artigo já está publicado:
```typescript
if (editingUpdate?.is_published && updateId) {
  indexArticleRAG(updateId);
}
```

---

## Parte 3 — Botão de backfill no admin RAG (`src/pages/admin/rag/Documents.tsx`)

Adicionar botão "Indexar Artigos" no header da página, ao lado do botão existente de criar documento.

```tsx
<Button variant="outline" onClick={handleBackfillArticles} disabled={backfilling}>
  {backfilling ? <Spinner className="animate-spin" /> : <FileText />}
  Indexar Artigos
</Button>
```

A função `handleBackfillArticles`:
1. Confirma via `window.confirm`
2. Chama `index-article-rag` com `{ action: "backfill" }`
3. Mostra toast com resultado
4. Invalida queries RAG via `queryClient`

---

## Arquivos

1. `supabase/functions/index-article-rag/index.ts` — novo (~250 linhas)
2. `src/pages/admin/SpaceContent.tsx` — 3 inserções (~15 linhas)
3. `src/pages/admin/rag/Documents.tsx` — botão + handler (~30 linhas)

## Não alterado

- `generate-chunks/index.ts`
- `ai-assistant/index.ts`
- `search_rag_chunks_lexical`
- Nenhuma tabela ou migration

