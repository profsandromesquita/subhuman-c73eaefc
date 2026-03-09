

# Correção: Layout desktop da página de post

## Causa raiz identificada

**PostDetail NÃO usa AppLayout.** A página renderiza seu próprio layout standalone — não há DesktopSidebar (barra de navegação lateral) nessa rota.

Porém, tanto `PostHeader.tsx` quanto `CommentInput.tsx` aplicam `lg:left-56` nos seus elementos fixos. Essa classe empurra o elemento 224px para a direita, reservando espaço para uma sidebar de navegação **que não existe nessa página**.

Resultado: header e barra de comentário ficam deslocados 224px à direita, aparecendo visivelmente mais estreitos e desalinhados em relação ao conteúdo principal do artigo, que ocupa a viewport completa.

```text
Viewport 1440px:
┌──────────────────────────────────────────────────────────┐
│ 224px vazio ← lg:left-56   │  PostHeader (1216px)       │  ← ERRADO
├──────────────────────────────────────────────────────────┤
│ Conteúdo do artigo centrado em max-w-6xl (1440px)       │  ← CERTO
├──────────────────────────────────────────────────────────┤
│ 224px vazio ← lg:left-56   │  CommentInput (1216px)     │  ← ERRADO
└──────────────────────────────────────────────────────────┘
```

## Correção (2 arquivos, 2 alterações)

### 1. `PostHeader.tsx` — linha 52
**De:** `className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md pt-safe lg:left-56"`
**Para:** `className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md pt-safe"`

Remove `lg:left-56`. O header fixo passa a ocupar toda a viewport. O inner div já tem `lg:max-w-6xl lg:mx-auto` que centraliza o conteúdo e alinha com o container do artigo.

### 2. `CommentInput.tsx` — linha 21
**De:** `className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-safe lg:left-56"`
**Para:** `className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-safe"`

Remove `lg:left-56`. O wrapper interno `max-w-6xl mx-auto lg:px-10` + `lg:max-w-[760px]` já garante alinhamento com a coluna do artigo.

## Resultado esperado

```text
Viewport 1440px (após correção):
┌──────────────────────────────────────────────────────────┐
│        PostHeader (max-w-6xl centrado, 1152px)           │  ← ALINHADO
├──────────────────────────────────────────────────────────┤
│        Conteúdo do artigo (max-w-6xl centrado)           │  ← ALINHADO
├──────────────────────────────────────────────────────────┤
│        CommentInput (max-w-6xl → 760px alinhado)         │  ← ALINHADO
└──────────────────────────────────────────────────────────┘
```

## Riscos
- Mobile inalterado: `lg:left-56` só aplica em `≥1024px`
- Sidebar do artigo (engagement/autor) não é afetada — ela está dentro do container flex, não é fixa
- Nenhum outro componente usa `lg:left-56`

## Validação
Browser testing na rota `/spaces/produtividade/post/gemini-31-pro-chega-prometendo-pensar-melhor-e-isso-muda-seu-trabalho` em viewport desktop para confirmar alinhamento.

