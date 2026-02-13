

# Correcao: Mencoes Clicaveis e Error Boundary Inteligente

## Problema 1: Mencoes (@) nao abrem modal

### Causa raiz identificada

A regex atual no `MentionText.tsx` exige que **toda palavra** apos o `@` comece com letra maiuscula:

```
/@[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+)*/g
```

No exemplo da imagem, o texto e `@Ana Priscilla de Sousa Coelho Mesquita`. A palavra **"de"** comeca com minuscula, entao a regex para em `@Ana Priscilla` e nao captura o nome completo. Quando busca no banco com `ilike('full_name', 'Ana Priscilla')`, nao encontra nenhum perfil chamado exatamente assim, e o modal nao abre.

### Solucao

Alterar a regex para aceitar palavras com inicio minusculo (preposicoes como "de", "da", "dos", "e"):

```
/@[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ]+)*/g
```

A diferenca e que apos o primeiro nome (que deve comecar com maiuscula para nao capturar texto normal), as palavras seguintes podem comecar com qualquer letra. A captura para quando encontra pontuacao, quebra de linha ou texto sem padrao de nome.

Alem disso, melhorar a busca no banco: em vez de buscar `ilike('full_name', cleanName)` que exige correspondencia exata, usar `ilike('full_name', '%' + cleanName + '%')` para busca parcial como fallback.

**Arquivo:** `src/components/post/MentionText.tsx`

---

## Problema 2: Error Boundary com ChunkLoadError

### Causa raiz

A aplicacao usa `lazy()` para todas as paginas (code splitting). Apos um deploy, os nomes dos arquivos JS mudam (hash no nome). Usuarios com a aba aberta tentam navegar, o browser tenta carregar o chunk antigo que nao existe mais, e o `ChunkLoadError` dispara o ErrorBoundary mostrando "Algo deu errado".

### Solucao

Implementar duas camadas de protecao:

**Camada 1 - ErrorBoundary inteligente** (`src/components/ErrorBoundary.tsx`):
- No `componentDidCatch`, verificar se o erro e um `ChunkLoadError` (nome do erro ou mensagem contendo "Loading chunk" / "dynamically imported module")
- Se for ChunkLoadError e ainda nao tentou reload (usar `sessionStorage` como flag), fazer `window.location.reload()` automatico
- Se ja tentou reload uma vez (flag existe), mostrar a tela de erro normal (evitar loop infinito)

**Camada 2 - Handler global de rejeicoes** (`src/main.tsx`):
- Adicionar `window.addEventListener('unhandledrejection', ...)` para capturar `ChunkLoadError` que ocorre fora do ciclo de renderizacao do React (lazy imports rejeitados)
- Mesma logica: reload automatico uma unica vez

**Feedback visual melhorado** na tela de erro para bugs reais:
- Adicionar botao "Ver detalhes" que expande/colapsa a mensagem de erro (disponivel em producao, nao apenas dev)
- Incluir timestamp do erro para facilitar debug
- Manter o botao "Recarregar pagina"

### Detalhes tecnicos

**`src/components/ErrorBoundary.tsx`:**
- Adicionar metodo `isChunkLoadError(error)` que verifica `error.name === 'ChunkLoadError'` ou `error.message.includes('Failed to fetch dynamically imported module')` ou `error.message.includes('Loading chunk')`
- No `componentDidCatch`: se `isChunkLoadError` e `!sessionStorage.getItem('chunk_reload')`, setar flag e `window.location.reload()`
- No `render`: adicionar estado `showDetails` com botao toggle para mostrar stack trace
- Adicionar timestamp formatado na UI de erro

**`src/main.tsx`:**
- Adicionar handler `unhandledrejection` antes do `createRoot`
- Verificar se `event.reason?.name === 'ChunkLoadError'` ou mensagem similar
- Fazer reload com flag de sessionStorage

---

## Ordem de implementacao

1. Corrigir regex e busca no `MentionText.tsx`
2. Atualizar `ErrorBoundary.tsx` com deteccao de ChunkLoadError e feedback melhorado
3. Adicionar handler global em `main.tsx`

