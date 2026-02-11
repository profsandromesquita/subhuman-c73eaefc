

# Correcao: Tela Preta — React chunk splitting quebrado

## Causa Raiz

O erro `TypeError: undefined is not an object (evaluating 'Rf.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED')` ocorre porque o `manualChunks` no `vite.config.ts` separa `react-dom` no chunk `vendor-react`, mas o pacote `react` (core) nao e capturado por nenhuma regra e vai para um chunk generico diferente.

`react-dom` depende internamente de `react.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`. Quando estao em chunks separados, a referencia se perde e o app inteiro quebra antes de renderizar qualquer coisa.

## Arquivo Afetado

`vite.config.ts`, linha 23.

## Correcao

Alterar a condicao do `manualChunks` para que o pacote `react` (core) tambem seja incluido no chunk `vendor-react`. A verificacao precisa usar um pattern que capture `node_modules/react/` sem capturar acidentalmente `react-dom` ou `react-router` (que ja sao tratados na mesma linha):

```text
Antes (quebrado):
  if (id.includes("react-dom") || id.includes("react-router")) return "vendor-react";

Depois (corrigido):
  if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/")) return "vendor-react";
```

O pattern `/react/` (com barras) garante que so captura o pacote `react` dentro de `node_modules/react/` e nao faz match parcial com `react-dom`, `react-router`, `react-hook-form`, etc.

## Impacto

- Corrige a tela preta imediatamente
- Nenhuma outra mudanca necessaria — o resto do `manualChunks` esta correto
- Zero risco de regressao, pois so altera a distribuicao de chunks no build

