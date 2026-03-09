

# Correção: "Em alta nos canais" em grid no desktop

## Problema
Linha 201 de `Home.tsx` — o container dos cards de discussão usa apenas `space-y-2.5` (coluna única), enquanto a seção "Destaques da semana" (linha 141) e a página `/highlights` (linha 257) usam `lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0`.

## Correção (1 arquivo)

**`src/pages/Home.tsx` — linha 201**

De:
```tsx
<div className="space-y-2.5">
```

Para:
```tsx
<div className="space-y-2.5 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
```

Mesmas classes já usadas na seção de destaques (linha 141) e na página `/highlights` (linha 257).

## Resultado
- Desktop: cards em grid de 2-3 colunas, consistente com "Destaques da semana" e `/highlights`
- Mobile: sem alteração (`space-y-2.5` continua ativo abaixo de `lg`)

## Arquivo alterado
- `src/pages/Home.tsx` (1 linha)

