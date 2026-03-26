

# Auditoria: Syntax Highlighting nos Code Blocks

## 1. Configuração atual do Tiptap

**Arquivo:** `src/components/editor/RichTextEditor.tsx`

**Extensões em uso:**
- StarterKit (inclui `CodeBlock` básico, sem highlighting)
- Link, Image, Youtube, Underline, TextStyle, Color, Highlight, Placeholder, Mention

**Pacotes NÃO instalados:**
- `@tiptap/extension-code-block-lowlight` — ausente
- `lowlight` — ausente
- `highlight.js` — ausente
- Nenhuma biblioteca de syntax highlighting (prism, shiki) instalada

O `StarterKit` inclui um `CodeBlock` básico que gera `<pre><code>` sem classes de linguagem e sem colorização.

## 2. Renderização atual dos code blocks

**PostContent.tsx:** Renderiza HTML via `dangerouslySetInnerHTML` com DOMPurify. Não há syntax highlighting em runtime.

**CSS em `src/components/editor/editor.css`:**
- `pre` recebe fundo `#141414`, borda `#262626`, border-radius 12px
- `code` dentro de `pre` recebe cor fixa `#e5e7eb` (cinza claro), fonte monospace
- **Tudo é monocromático** — não há classes `.hljs-*` ou tokens coloridos

**HTML salvo no banco:** Tags `<pre><code>` sem atributo `class` de linguagem (StarterKit CodeBlock não adiciona).

## 3. Tema visual

- Dark-only (`#000000` fundo, `#141414` cards)
- Nenhuma biblioteca de highlighting instalada

## 4. Arquivos relevantes

| Arquivo | Caminho |
|---|---|
| Editor Tiptap | `src/components/editor/RichTextEditor.tsx` |
| PostContent | `src/components/post/PostContent.tsx` |
| CSS do editor | `src/components/editor/editor.css` |
| CSS global | `src/index.css` |

## 5. O que precisa ser feito para implementar

### No editor (escrita)
1. Instalar `@tiptap/extension-code-block-lowlight`, `lowlight`, `highlight.js`
2. Em `RichTextEditor.tsx`: substituir o `CodeBlock` do StarterKit pelo `CodeBlockLowlight` configurado com lowlight + linguagens
3. Isso faz o editor salvar `<pre><code class="language-javascript">` no HTML

### Na visualização (leitura)
1. No `PostContent.tsx`: após `dangerouslySetInnerHTML`, usar um `useEffect` para aplicar `lowlight.highlightAuto()` nos blocos `<pre><code>` do DOM (ou usar `highlight.js` diretamente)
2. Importar um tema CSS do highlight.js compatível com dark mode (ex: `github-dark`, `atom-one-dark`, ou customizado)

### CSS
1. Importar o tema highlight.js (ex: `highlight.js/styles/atom-one-dark.css`)
2. Ajustar os estilos de `pre/code` em `editor.css` para não sobrescrever as cores dos tokens `.hljs-*`

