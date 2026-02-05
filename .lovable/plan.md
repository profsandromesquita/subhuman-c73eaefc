

# Plano de Correção: Sistema de Chunks sob Controle Manual do Admin

## Diagnóstico do Problema

### Fluxo Atual (errado)
```text
Admin clica "Indexar Documento"
      ↓
ingest-document executa:
  1. Insere/atualiza documento
  2. AUTOMATICAMENTE gera chunks → (comportamento indesejado)
  3. Marca como "indexed"
```

### Fluxo Desejado
```text
Admin clica "Adicionar Documento"
      ↓
ingest-document:
  1. Insere documento com status "pending"
  2. NÃO gera chunks
  3. Retorna sucesso

      ↓ (ação separada)

Admin clica "Gerar Chunks" na página de Chunks
      ↓
generate-chunks (nova edge function):
  1. Busca documento
  2. Gera chunks
  3. Marca como "indexed"
```

---

## Mudanças Necessárias

### 1. Modificar Edge Function `ingest-document`

**Comportamento atual**: Gera chunks automaticamente
**Novo comportamento**: Apenas salva o documento, NÃO gera chunks

```text
Mudanças:
- Remover toda a lógica de chunking
- Inserir documento com status "pending" (não "processing")
- Retornar sucesso imediatamente
```

### 2. Criar Nova Edge Function `generate-chunks`

Nova função dedicada para geração de chunks, chamada manualmente:

```text
Parâmetros:
- documentId: ID do documento para gerar chunks

Fluxo:
1. Verificar se documento existe
2. Deletar chunks existentes (se houver)
3. Processar conteúdo em chunks
4. Inserir chunks na tabela
5. Marcar documento como "indexed"
```

### 3. Adicionar Hook `useGenerateChunks`

Novo hook em `src/hooks/useRAGDocuments.ts`:

```typescript
export function useGenerateChunks() {
  // Chama a edge function generate-chunks
  // Invalida queries de chunks após sucesso
}
```

### 4. Adicionar Hook `useDeleteChunk`

Permitir exclusão de chunks individuais:

```typescript
export function useDeleteChunk() {
  // DELETE chunk por ID
  // Invalida queries de chunks
}
```

### 5. Atualizar Página `/admin/rag/Documents.tsx`

Adicionar botão "Gerar Chunks" para documentos com status "pending":

```text
Na tabela de documentos:
- Documentos "pending" mostram botão "Gerar Chunks"
- Documentos "indexed" mostram botão "Regenerar Chunks"
- Remover geração automática do botão "Indexar Documento"
```

### 6. Atualizar Página `/admin/rag/Chunks.tsx`

Adicionar funcionalidade de exclusão:

```text
- Botão de excluir em cada card de chunk
- Botão "Excluir Todos" para limpar chunks de um documento
- Confirmação antes de excluir
```

---

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/ingest-document/index.ts` | Modificar - remover chunking automático |
| `supabase/functions/generate-chunks/index.ts` | **CRIAR** - nova função para gerar chunks |
| `supabase/config.toml` | Adicionar nova função |
| `src/hooks/useRAGDocuments.ts` | Adicionar `useGenerateChunks` |
| `src/hooks/useRAGChunks.ts` | Adicionar `useDeleteChunk`, `useDeleteAllChunks` |
| `src/pages/admin/rag/Documents.tsx` | Adicionar botão "Gerar Chunks" |
| `src/pages/admin/rag/Chunks.tsx` | Adicionar botões de exclusão |

---

## Detalhes Técnicos

### Nova Edge Function `generate-chunks`

```text
Endpoint: POST /functions/v1/generate-chunks
Body: { documentId: string }
Auth: Requer admin/moderator

Fluxo:
1. Validar autenticação
2. Buscar documento por ID
3. Validar que documento existe
4. Marcar status como "processing"
5. Deletar chunks existentes
6. Fazer chunking do conteúdo
7. Inserir novos chunks
8. Marcar status como "indexed"
9. Retornar contagem de chunks criados
```

### Botão de Exclusão de Chunk

```text
- Cada chunk terá ícone de lixeira
- Clique abre confirmação
- Após excluir, atualiza lista
- Se documento ficar sem chunks, status volta para "pending"
```

---

## Fluxo Final do Admin

1. **Adicionar Documento**
   - Admin cola conteúdo no modal
   - Clica "Adicionar Documento"
   - Documento salvo com status "pending"
   - Nenhum chunk gerado

2. **Gerar Chunks (ação separada)**
   - Admin vai na lista de documentos
   - Clica no botão "Gerar Chunks" do documento desejado
   - Sistema processa e cria chunks
   - Status muda para "indexed"

3. **Gerenciar Chunks**
   - Admin pode ver todos os chunks em `/admin/rag/chunks`
   - Pode excluir chunks individuais
   - Pode excluir todos os chunks de um documento
   - Pode regenerar chunks a qualquer momento

---

## Resultado Esperado

- Nenhum chunk é gerado automaticamente
- Admin tem controle total sobre quando gerar chunks
- Chunks podem ser excluídos individualmente ou em massa
- Sistema mantém consistência entre documentos e chunks

