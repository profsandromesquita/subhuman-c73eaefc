

# Plano: Ajustes de layout em 4 páginas

## 1. Caixa de comentário desproporcional na página de artigo (Imagem 1)

**Problema**: O `CommentInput` usa `fixed bottom-0 left-0 right-0` com `max-w-2xl`, fazendo a barra ocupar toda a largura da tela. No desktop com sidebar, ela deveria se alinhar à coluna do artigo.

**Correção em `src/components/post/CommentInput.tsx`**:
- Trocar o container interno de `max-w-2xl` para `lg:max-w-[760px]` (mesmo max-width da coluna do artigo em `PostDetail.tsx` linha 271)
- Adicionar `lg:ml-56` para compensar a sidebar de navegação, mantendo a barra de comentário alinhada à coluna de conteúdo

## 2. Cards de artigos em `/spaces/:slug` e `/home` fora do padrão de `/highlights` (Imagens 2 e 3)

**Problema**: A página `/highlights` usa um grid responsivo (`lg:grid-cols-2 xl:grid-cols-3`) com cards compactos estilo "badge + título + thumbnail". As páginas `/home` e `/spaces/:slug` usam cards em lista vertical (`space-y-2.5` / `space-y-3`), sem grid no desktop.

**Correção em `src/pages/Home.tsx`** (seção Highlights, linhas 141-181):
- Trocar `space-y-2.5` por `space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0` — mesmo padrão de `/highlights`

**Correção em `src/pages/SpaceDetail.tsx`** (seção Feed, linhas 114-161):
- Trocar `space-y-3` por `space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0`

## 3. Cards de canais com altura desigual (Imagem 4)

**Problema**: Em `src/pages/Channels.tsx`, os cards usam altura automática (`bg-card rounded-2xl`), fazendo cards com mais texto ficarem mais altos que outros.

**Correção em `src/pages/Channels.tsx`** (linha 60):
- Adicionar `h-full flex flex-col` ao container do card
- Truncar a descrição com `line-clamp-2` (já existe) e fixar o footer de stats na base com `mt-auto`
- Envolver o `motion.div` pai com classe que garanta stretch no grid: os filhos do grid CSS já esticam por padrão, basta garantir que o `<Link>` e a div interna usem `h-full`

Estrutura:
```
<Link className="block group h-full">
  <div className="... h-full flex flex-col">
    <div className="flex-1">  <!-- conteúdo -->
    <div className="mt-auto">  <!-- stats fixo na base -->
  </div>
</Link>
```

## 4. Botão do evento muda de posição conforme texto (Imagem 5)

**Problema**: Em `src/pages/Events.tsx`, o `EventCard` não tem altura fixa nem layout flex-col com botão fixo na base. Cards com mais descrição empurram o botão para baixo.

**Correção em `src/pages/Events.tsx`** (EventCard, linhas 170-239):
- Envolver o card em `h-full flex flex-col`
- A div de conteúdo (`p-4 space-y-3`) deve usar `flex-1 flex flex-col`
- O bloco de botões (`getActionButtons()`) deve receber `mt-auto` para ficar fixo na base
- Truncar `event.description` com `line-clamp-2` (já existe)
- Truncar `event.title` com `line-clamp-2` (já existe)

Estrutura:
```
<div className="bg-card rounded-xl overflow-hidden h-full flex flex-col">
  <img ... />
  <div className="p-4 space-y-3 flex-1 flex flex-col">
    <!-- badges, título, descrição, datas -->
    <div className="mt-auto space-y-3">
      <!-- preço + botões -->
    </div>
  </div>
</div>
```

## Resumo de arquivos

| Arquivo | Alteração |
|---|---|
| `src/components/post/CommentInput.tsx` | Alinhar barra à coluna do artigo no desktop |
| `src/pages/Home.tsx` | Grid responsivo nos cards de highlights |
| `src/pages/SpaceDetail.tsx` | Grid responsivo nos cards de artigos |
| `src/pages/Channels.tsx` | Altura fixa nos cards + stats na base |
| `src/pages/Events.tsx` | Altura fixa nos cards + botão na base |

