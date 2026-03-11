

# Edição de Prioridade dos Documentos RAG

## Viabilidade

Sim, alterar a prioridade surte efeito imediato. As funções SQL `search_rag_chunks_lexical` e `search_rag_chunks` ordenam por `priority DESC` em tempo de consulta. A prioridade também é herdada pelos chunks. Basta atualizar o valor no banco e, opcionalmente, propagar para os chunks existentes.

## Mudanças

### 1. Hook `useUpdateDocumentPriority` — `src/hooks/useRAGDocuments.ts`
Nova mutation que:
- Atualiza `rag_documents.priority` via Supabase client
- Atualiza `rag_chunks.priority` para todos os chunks do documento (propagação)
- Invalida queries relevantes

### 2. UI inline na tabela — `src/pages/admin/rag/Documents.tsx`
Substituir o `<span>` estático da coluna "Prioridade" por um componente clicável:
- Ao clicar no valor, abre um pequeno `Popover` com um `Input` numérico (0-100) e botão "Salvar"
- Ao salvar, chama a mutation que atualiza documento + chunks
- Feedback via toast

### Fluxo do usuário
1. Admin vê a coluna "Prioridade" com o valor atual (ex: 50)
2. Clica no valor → abre popover inline com input numérico
3. Digita novo valor (ex: 80) → clica "Salvar"
4. Documento e seus chunks são atualizados → efeito imediato nas próximas consultas do assistente

### Arquivos alterados
- `src/hooks/useRAGDocuments.ts` — adicionar `useUpdateDocumentPriority`
- `src/pages/admin/rag/Documents.tsx` — substituir span por popover editável

