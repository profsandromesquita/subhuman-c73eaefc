
# Correção Definitiva: Blocos de Prompt com Botão Copiar nos Artigos

## Diagnóstico das Falhas

A auditoria identificou 4 causas raízes que, combinadas, tornam o recurso invisível mesmo com o código presente:

### Falha 1 — Variável CSS inexistente (CRÍTICO)
O `CodeBlockCopyButton` usa `hsl(var(--elevated))` tanto no botão quanto no CSS do código inline. Essa variável **não existe** no sistema de design. O nome correto é `--surface-elevated`. O resultado é que o botão copiar fica com fundo transparente, tornando-o praticamente invisível sobre o bloco de código.

Arquivo afetado: `src/components/post/CodeBlockCopyButton.tsx` (linha 24)
Arquivo afetado: `src/components/editor/editor.css` (linha 202)

### Falha 2 — Especificidade CSS (ALTO)
O padding do bloco `<pre>` definido em `.prose pre` (`padding: 16px 48px 16px 16px`) é disputado pelas classes utilitárias do Tailwind `prose`. Como o elemento usa `className="prose prose-sm dark:prose-invert ..."`, as regras do `@tailwindcss/typography` podem sobrescrever o padding definido no `editor.css`, eliminando o espaço reservado para o botão copiar.

Arquivo afetado: `src/components/editor/editor.css` (linhas 176-185)

### Falha 3 — Timing da injeção do botão (MÉDIO)
O `useEffect` que injeta os botões nos `<pre>` tem `[content, canReadFullArticles]` como dependências. Se `canReadFullArticles` mudar de `false` para `true` após o conteúdo já ter sido renderizado (o que é o caso normal — o hook de acesso carrega de forma assíncrona), o effect roda novamente. Porém, existe a verificação `if (pre.querySelector('.code-copy-btn')) return` que bloqueia a re-injeção. O problema é que no primeiro render (quando `canReadFullArticles = false`), o conteúdo está dentro do `<ContentPaywall>` e o `ref` aponta para ele. Quando `canReadFullArticles` muda para `true`, o `<div>` do ref é um elemento diferente no DOM, mas o React pode não re-atribuir o ref se o componente não remontou. O efeito precisa ser mais robusto.

Arquivo afetado: `src/components/post/PostContent.tsx` (linhas 124-150)

### Falha 4 — `!important` ausente no CSS do bloco (BAIXO)
Sem `!important` ou especificidade maior, os estilos visuais do bloco (background, border-radius, padding) podem ser sobrescritos pelas regras padrão do `prose` do Tailwind, tornando o bloco visualmente idêntico a um `<pre>` genérico sem nenhuma identidade visual de "prompt copiável".

---

## Plano de Correção por Arquivo

### 1. Corrigir `CodeBlockCopyButton.tsx` — variável CSS quebrada

Trocar `hsl(var(--elevated))` por `hsl(var(--surface-elevated))` no estilo do botão. Também aumentar a visibilidade do botão adicionando uma borda sutil para que ele seja distinguível sobre o fundo escuro do bloco.

```tsx
// ANTES (linha 24):
className="absolute top-2 right-2 p-1.5 rounded-lg bg-[hsl(var(--elevated))] ..."

// DEPOIS:
className="absolute top-2 right-2 p-1.5 rounded-lg bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] ..."
```

### 2. Corrigir `editor.css` — variável CSS quebrada + especificidade

Duas correções neste arquivo:

**a)** Corrigir a variável `--elevated` para `--surface-elevated` no código inline:
```css
/* ANTES (linha 202): */
background: hsl(var(--elevated));

/* DEPOIS: */
background: hsl(var(--surface-elevated));
```

**b)** Aumentar a especificidade dos estilos do bloco `<pre>` usando `!important` ou seletor mais específico para vencer o Tailwind prose:
```css
/* Adicionar !important para garantir que os estilos do prose sejam sobrescritos */
.prose pre,
.post-content pre {
  background: #141414 !important;
  border: 1px solid #262626 !important;
  border-radius: 12px !important;
  padding: 16px 48px 16px 16px !important;
  margin: 24px 0 !important;
  position: relative !important;
  overflow-x: auto !important;
}
```

### 3. Corrigir `PostContent.tsx` — timing do useEffect

Adicionar um `useCallback` que force a injeção dos botões com uma pequena espera via `setTimeout` para garantir que o DOM esteja montado antes de buscar os `<pre>`. Também remover a verificação de skip que previne re-injeção quando o ref muda:

```tsx
useEffect(() => {
  const el = contentRef.current;
  if (!el) return;

  // Aguarda o DOM estabilizar após o dangerouslySetInnerHTML
  const timer = setTimeout(() => {
    const roots: ReturnType<typeof createRoot>[] = [];
    // Remover botões antigos antes de re-injetar (evita duplicatas sem bloquear re-runs)
    el.querySelectorAll('.code-copy-btn').forEach(el => el.remove());
    
    const preBlocks = el.querySelectorAll('pre');
    preBlocks.forEach((pre) => {
      pre.style.position = 'relative';
      const container = document.createElement('div');
      container.className = 'code-copy-btn';
      pre.appendChild(container);
      const codeText = pre.querySelector('code')?.textContent || pre.textContent || '';
      const root = createRoot(container);
      root.render(<CodeBlockCopyButton code={codeText} />);
      roots.push(root);
    });
    
    return () => roots.forEach(root => root.unmount());
  }, 50);

  return () => clearTimeout(timer);
}, [content, canReadFullArticles]);
```

---

## Resumo de arquivos alterados

| Arquivo | Correção | Impacto |
|---|---|---|
| `src/components/post/CodeBlockCopyButton.tsx` | Variável CSS `--elevated` → `--surface-elevated` + borda no botão | Botão visível |
| `src/components/editor/editor.css` | Variável CSS corrigida + `!important` nos estilos do bloco | Estilo do bloco aplicado |
| `src/components/post/PostContent.tsx` | `setTimeout` + limpeza de botões antigos antes de re-injetar | Injeção confiável |

## Resultado esperado após correção

| Elemento | Antes (quebrado) | Depois (correto) |
|---|---|---|
| Botão copiar | Invisível (fundo transparente) | Visível — fundo escuro com borda sutil |
| Bloco de código/prompt | Visual genérico, sem identidade | Fundo `#141414`, borda, `border-radius: 12px` |
| Código inline | Fundo transparente | Badge com fundo `#1f1f1f` |
| Injeção do botão | Pode falhar se acesso carrega após render | Sempre injeta após 50ms de estabilização do DOM |
