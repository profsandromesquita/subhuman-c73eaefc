

# Correção de layout desktop — Página de Post

## Diagnóstico

A página tem um container central `lg:max-w-6xl lg:mx-auto` com uma coluna de artigo `lg:max-w-[760px]`. Porém, os 3 componentes filhos (`PostContent`, `PostEngagement`, `CommentSection`) aplicam `max-w-2xl mx-auto` (672px) internamente, criando uma faixa 88px mais estreita que a coluna pai. Os elementos fixos (`PostHeader`, `CommentInput`, guest banner) não estão limitados ao mesmo container central.

```text
┌─ PostHeader (fixed, sem max-width) ──────────── toda a viewport ─┐
├─ Container lg:max-w-6xl ─────────────────────────────────────────┤
│  ┌─ Coluna lg:max-w-[760px] ─────────┐  ┌─ Sidebar 224px ──┐   │
│  │  PostContent:    max-w-2xl (672px) │  │                  │   │
│  │  PostEngagement: max-w-2xl (672px) │  │                  │   │
│  │  CommentSection: max-w-2xl (672px) │  │                  │   │
│  └────────────────────────────────────┘  └──────────────────┘   │
├─ CommentInput (fixed, lg:max-w-[760px] centrado na viewport) ────┤
└──────────────────────────────────────────────────────────────────┘
```

## Correções (5 arquivos, 6 alterações)

### 1. `PostContent.tsx` — linha 187
**De:** `max-w-2xl mx-auto px-5 py-6 lg:px-10 lg:py-8`
**Para:** `max-w-2xl mx-auto px-5 py-6 lg:max-w-none lg:px-0 lg:py-8`

Remove a contenção interna e o padding duplicado no desktop (o container pai já fornece `lg:px-10`).

### 2. `PostEngagement.tsx` — linha 21
**De:** `max-w-2xl mx-auto px-5`
**Para:** `max-w-2xl mx-auto px-5 lg:max-w-none lg:px-0`

### 3. `CommentSection.tsx` — linha 45
**De:** `max-w-2xl mx-auto px-5 pb-32`
**Para:** `max-w-2xl mx-auto px-5 pb-32 lg:max-w-none lg:px-0`

### 4. `PostHeader.tsx` — linha 54
**De:** `px-4 h-14 flex items-center justify-between lg:px-10`
**Para:** `px-4 h-14 flex items-center justify-between lg:px-10 lg:max-w-6xl lg:mx-auto`

Alinha o header ao mesmo container `max-w-6xl` do artigo.

### 5. `CommentInput.tsx` — linhas 21-22
**De:**
```tsx
<div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-safe lg:left-56">
  <div className="max-w-2xl mx-auto lg:max-w-[760px]">
```
**Para:**
```tsx
<div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-safe lg:left-56">
  <div className="max-w-6xl mx-auto lg:px-10">
    <div className="lg:max-w-[760px]">
```
Adiciona um wrapper `max-w-6xl mx-auto lg:px-10` para espelhar o container do artigo, com inner `lg:max-w-[760px]` alinhado à coluna esquerda. Requer fechar a div extra (linha 29).

### 6. `PostDetail.tsx` — linhas 255-263 (guest banner)
**De:** `max-w-2xl mx-auto px-4`
**Para:** `max-w-6xl mx-auto px-4 lg:px-10`

## Ordem de implementação

1. PostContent, PostEngagement, CommentSection (neutralizar max-w — sem risco)
2. PostHeader (alinhar ao container — sem risco)
3. CommentInput (wrapper extra — risco baixo, testar alinhamento)
4. Guest banner (alinhar ao container)

## Risco de regressão
- Mobile inalterado: todas as mudanças usam prefixo `lg:`
- O padding do conteúdo no desktop vem do `lg:px-10` em `PostDetail.tsx` linha 269, que já existe

