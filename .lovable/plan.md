
# Blocos de codigo/prompt com botao "Copiar" nos artigos

## Contexto

Os artigos dos Espacos sao escritos com o editor Tiptap (RichTextEditor) e exibidos no componente PostContent via `dangerouslySetInnerHTML`. O Tiptap StarterKit ja inclui suporte a blocos de codigo (`<pre><code>...</code></pre>`), porem:

1. No **editor**, so existe o botao de `code` inline -- nao ha botao para inserir bloco de codigo (code block)
2. Na **exibicao**, blocos `<pre>` aparecem com estilo basico mas sem nenhum botao de copiar
3. Nao ha identificacao visual clara de que um bloco e um "prompt" copiavel

## Plano de implementacao

### 1. Adicionar botao "Bloco de Codigo" na toolbar do editor

**Arquivo**: `src/components/editor/EditorToolbar.tsx`

- Adicionar um segundo botao ao lado do `Code` inline existente, usando o icone `CodeBlock` do Phosphor Icons
- Ao clicar, executa `editor.chain().focus().toggleCodeBlock().run()`
- Isso permite que o autor do artigo insira blocos de codigo/prompt formatados

### 2. Criar componente CodeBlockCopyButton

**Arquivo novo**: `src/components/post/CodeBlockCopyButton.tsx`

Componente React que renderiza um botao "Copiar" flutuante no canto superior direito de blocos `<pre>`. Ao clicar:
- Copia o texto do bloco para a area de transferencia (`navigator.clipboard.writeText`)
- Mostra feedback visual: icone muda de "Copiar" para "Copiado" por 2 segundos
- Estilo: fundo `bg-elevated` (`#1f1f1f`), icone branco, `rounded-lg`, posicionado `absolute top-2 right-2`

### 3. Processar blocos de codigo no PostContent apos renderizacao

**Arquivo**: `src/components/post/PostContent.tsx`

Adicionar um `useEffect` que, apos o conteudo HTML ser inserido via `dangerouslySetInnerHTML`, percorre todos os `<pre>` dentro do `contentRef` e injeta o botao de copiar usando `createRoot` do React DOM:

```
useEffect -> querySelectorAll('pre') -> para cada <pre>:
  1. Adicionar position: relative ao <pre>
  2. Criar um container div
  3. Renderizar <CodeBlockCopyButton /> dentro dele
  4. Append ao <pre>
```

### 4. Estilizar blocos de codigo para exibicao nos artigos

**Arquivo**: `src/components/editor/editor.css`

Adicionar/atualizar estilos para a exibicao no artigo (prose context):

```css
/* Bloco de codigo nos artigos - visual de "prompt" */
.prose pre {
  position: relative;
  background: #141414;         /* bg-card */
  border: 1px solid #262626;   /* border-subtle */
  border-radius: 12px;
  padding: 16px 48px 16px 16px; /* espaco para o botao copiar */
  overflow-x: auto;
  margin: 24px 0;
}

.prose pre code {
  background: transparent;
  padding: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #e5e7eb;
  font-family: 'JetBrains Mono', 'Fira Code', monospace, ui-monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Codigo inline */
.prose code:not(pre code) {
  background: #1f1f1f;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 13px;
  color: #e5e7eb;
}
```

## Resumo de arquivos

| Arquivo | Acao | Descricao |
|---|---|---|
| `src/components/post/CodeBlockCopyButton.tsx` | Criar | Botao "Copiar" com feedback visual |
| `src/components/post/PostContent.tsx` | Editar | useEffect para injetar botoes nos `<pre>` |
| `src/components/editor/EditorToolbar.tsx` | Editar | Botao "Bloco de Codigo" na toolbar |
| `src/components/editor/editor.css` | Editar | Estilos visuais para blocos de codigo |

## Comportamento final

| Elemento | Descricao |
|---|---|
| Bloco de codigo no artigo | Fundo escuro `#141414`, borda sutil, border-radius 12px, fonte mono |
| Botao copiar | Icone no canto superior direito, hover sutil, muda para "Copiado" apos clique |
| Codigo inline | Badge com fundo `#1f1f1f`, arredondado, fonte mono |
| Editor (admin) | Novo botao na toolbar para inserir blocos de codigo/prompt |
