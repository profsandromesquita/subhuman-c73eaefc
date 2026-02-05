
## Objetivo (o que vai ficar certo)
1) **Página /admin/rag/chunks** vai ter **exclusão funcionando e visível** (sem depender de “hover”).
2) **Frontmatter YAML** (`--- ... ---`) vai ser **lido corretamente** ao salvar documento, preenchendo:
   - `title`
   - `layer` (constituicao | nucleo | biblioteca)
   - `priority`
   - `tags`
3) **Chunks nunca serão gerados automaticamente** (somente quando o admin clicar em “Gerar/Regenerar Chunks”).
4) Resolver o “lixo” atual: dar caminhos claros para **limpar chunks indevidos** e **corrigir documento salvo errado**.

---

## Diagnóstico com base nas imagens anexas
### Imagem 1 (Chunks)
- O botão de excluir **existe no código**, mas está configurado como:
  - `opacity-0 group-hover:opacity-100`
- Em prática isso vira “não existe” para:
  - uso sem hover (mobile, trackpad, ou usuário sem perceber que precisa passar o mouse)
  - e mesmo no desktop fica invisível no print (porque não havia hover no momento).

### Imagem 2 (Documents)
- Documento salvo como **“Documento sem título / Biblioteca / tags automáticas”**.
- Isso só acontece quando o **frontmatter não foi detectado** (parser falhou) e o sistema caiu nos defaults:
  - title: “Documento sem título”
  - layer: “biblioteca”
  - tags: extraídas automaticamente do texto (“programacao, dev, codigo +22”)
- Além disso, na Imagem 1 dá para ver que o conteúdo do chunk ainda contém o próprio frontmatter, confirmando que a remoção do frontmatter também falhou.

Causa provável: o parser atual depende de regex estrita `^---\n ... \n---\n...` e falha com pequenas variações comuns (ex.: espaços antes do `---`, BOM/char invisível no início, linha `---` com espaços, ausência de quebra de linha exata, etc.).

---

## Mudanças propostas (implementação)

### A) Corrigir a UI de exclusão na página Chunks (visível sempre)
**Arquivo:** `src/pages/admin/rag/Chunks.tsx`

1) **Excluir por chunk (visível sempre)**
   - Trocar o botão de excluir para ficar **sempre visível** no header do card.
   - Estilo: ícone pequeno, discreto, mas presente (ex.: `text-muted-foreground hover:text-destructive`).
   - Manter confirmação via `AlertDialog`.

2) **Excluir todos (por documento) mais óbvio**
   - O botão “Excluir Todos” hoje só aparece quando o filtro do documento ≠ “all”.
   - Melhorias:
     - Deixar o Select “Todos os documentos” com texto/ajuda: “Selecione um documento para habilitar ações em massa”.
     - Opcional: exibir um callout/mini alerta quando `documentFilter === "all"` dizendo:
       - “Para excluir em massa, selecione um documento no filtro.”

3) **Acessibilidade**
   - Adicionar `aria-label="Excluir chunk"` no botão.
   - Garantir que o ícone tenha contraste e não dependa de hover.

---

### B) Garantir que deletar chunk realmente deixe o estado consistente
**Arquivo:** `src/hooks/useRAGChunks.ts`

1) Ajustar `useDeleteChunk` para receber também `documentId` (ex.: `{ chunkId, documentId }`).
2) Após deletar:
   - verificar se ainda existem chunks para o documento (query `head: true, count: exact`)
   - se `count === 0`, atualizar o documento para `status: "pending"` (igual já fazemos no “Excluir Todos”).

Isso evita documento “indexed” sem chunks.

---

### C) Corrigir parsing do frontmatter (robusto) no backend functions
Vamos padronizar um parser mais resiliente, sem regex frágil, usando leitura de linhas:

- Aceitar:
  - espaços antes de `---`
  - `---` com espaços ao final
  - BOM no início do texto
  - frontmatter com linhas em branco entre campos
- Separar:
  - `metadata` (title/layer/priority/tags)
  - `body` (conteúdo real sem frontmatter)

**Arquivos:**
- `supabase/functions/ingest-document/index.ts`
- `supabase/functions/generate-chunks/index.ts`

Mudanças específicas:
1) **ingest-document**
   - Usar o novo parser para extrair metadados.
   - Validar `layer` e `priority`.
   - **Tags**:
     - Se `tags` vierem no frontmatter e não estiverem vazias: usar **somente as tags manuais** (sem auto-tag “programacao/dev/codigo”).
     - Se não vier tags manuais: aí sim aplicar auto-tags (e ainda assim com limite, ex.: máximo 12 para evitar explosão).

2) **generate-chunks**
   - Usar o mesmo parser para pegar `body` sem frontmatter antes de chunkar.
   - Tags por chunk:
     - herdar tags do documento (manuais) + auto-tags do chunk
     - deduplicar e limitar (ex.: máximo 15)

Resultado: a “Constituição do Subhumano” vai cair como `constituicao`, prioridade 100 e tags `identidade/manifesto/regras` como esperado.

---

### D) Corrigir o que já foi salvo errado (sem “jogar fora” se você não quiser)
Hoje você tem 2 caminhos; vou implementar pelo menos o mais direto dentro do admin:

**Arquivo:** `src/pages/admin/rag/Documents.tsx`

Adicionar ações por documento:
1) **“Corrigir metadados do frontmatter”**
   - Lê `source_content` do documento (já está no banco) e reaplica o parser:
     - atualiza `title`, `layer`, `priority`, `tags`
   - Observação: pode manter `slug` como está (para não “mudar identidade”), ou regenerar apenas se for “documento-sem-titulo…”. Vou manter por segurança e simplicidade.

2) **“Excluir chunks”**
   - Botão que chama `useDeleteAllChunks` (ou cria um hook auxiliar que delete por docId e marque pending).
   - Isso resolve o “montão de chunk indevido” rapidamente sem precisar caçar um por um.

3) Fluxo recomendado pós-correção:
   - Corrigir metadados
   - Excluir chunks
   - Gerar chunks novamente (manual)

---

## Checklist de teste (o que vou validar)
1) Em `/admin/rag/chunks`: cada card mostra ícone de lixeira **sem hover**.
2) Clique no ícone → abre confirmação → exclui chunk → toast OK → lista atualiza.
3) Se apagar o último chunk de um doc → doc vira `pending`.
4) Em `/admin/rag/documents`: colar exatamente o seu frontmatter:
   - salva com `Constituição do Subhumano`, `constituicao`, prioridade 100, tags manuais.
5) Gerar chunks:
   - chunks não contêm o frontmatter no corpo
   - tags não “explodem” indevidamente (manuais prevalecem)
6) “Corrigir metadados do frontmatter” em um doc bugado:
   - atualiza título/camada/tags corretamente
7) “Excluir chunks” limpa tudo e volta doc para `pending`.

---

## Arquivos que serão alterados
- `src/pages/admin/rag/Chunks.tsx` (botão excluir visível + UX ações em massa)
- `src/hooks/useRAGChunks.ts` (delete individual ajusta status para pending quando necessário)
- `supabase/functions/ingest-document/index.ts` (parser robusto + regras de tags)
- `supabase/functions/generate-chunks/index.ts` (remover frontmatter do body + tags por chunk)
- `src/pages/admin/rag/Documents.tsx` (ações “Corrigir metadados” e “Excluir chunks”)

---

## Mitigação imediata (enquanto eu implemento)
- Para apagar tudo rápido hoje: em `/admin/rag/chunks`, selecione o documento no filtro (não “Todos os documentos”) e use **Excluir Todos**.
- Para corrigir o documento bugado hoje: apagar o documento e criar novamente funciona, mas vou implementar o botão “Corrigir metadados” para não depender disso.

