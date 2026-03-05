# Desktop Redesign — Guia de Reestruturação

## Princípios Gerais

A aplicação hoje usa `max-w-lg mx-auto` em todas as páginas — uma coluna centralizada de ~512px que funciona bem em mobile mas desperdiça 60–70% da tela em desktop. O objetivo é criar um layout de **duas ou três colunas** sem quebrar o comportamento mobile.

**Breakpoints usados:**
- `< 768px` → mobile (comportamento atual, sem alteração)
- `768px – 1023px` → tablet (ajustes pontuais)
- `≥ 1024px` → desktop (layout novo)

**Regra de ouro:** toda classe nova para desktop usa prefixo `lg:`. Nenhuma classe existente sem prefixo é removida ou alterada.

---

## 1. Estrutura de Layout Global

### Problema atual
`AppLayout` renderiza apenas `BottomNav` (mobile). Em desktop não há navegação lateral, o conteúdo fica numa coluna estreita no centro.

### Solução: Sidebar + Content Area

```
┌─────────────────────────────────────────────────────┐
│  [Sidebar 240px fixo]  │  [Content]  │  [Right 280px]│
│                        │             │  (só em páginas│
│  Logo                  │  <children> │   de feed)     │
│  Nav items             │             │               │
│  ─────────             │             │               │
│  Trial banner          │             │               │
└─────────────────────────────────────────────────────┘
```

### Implementação em `AppLayout.tsx`

Adicionar wrapper desktop sem tocar no markup mobile:

```tsx
// AppLayout.tsx — estrutura nova
<div className="min-h-screen bg-background pt-safe">
  {/* Sidebar — só aparece em lg+ */}
  <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:flex-col lg:border-r lg:border-border lg:bg-background lg:z-40">
    <DesktopSidebar />
  </aside>

  {/* Main content — em lg+ tem margem esquerda da sidebar */}
  <main className={cn(
    showNav ? "pb-20 lg:pb-0" : "",
    "lg:ml-60"
  )}>
    {children}
  </main>

  {/* BottomNav — só em mobile */}
  {showNav && (
    <div className="lg:hidden">
      <BottomNav />
    </div>
  )}

  {status === 'trial' && daysRemaining !== null && (
    <TrialBanner daysRemaining={daysRemaining} />
  )}
</div>
```

### Novo componente `DesktopSidebar`

```tsx
// DesktopSidebar.tsx
// Mesmos navItems do BottomNav + Logo no topo
// Layout vertical com label ao lado do ícone
// Item ativo: bg-secondary, texto foreground
// Item inativo: texto muted-foreground, hover bg-accent/50
```

Estrutura visual da sidebar:
```
┌──────────────────────┐
│  [Logo]              │  ← Logo size="sm", padding 20px
│                      │
│  ⌂  Início           │  ← item ativo: fundo secondary
│  ⊞  Espaços          │
│  🎙  Podcast          │
│  🤖  IA               │
│  💬  Canais           │
│  📅  Eventos          │
│  ─────────────────   │
│  👤  Perfil           │  ← separado no bottom da sidebar
└──────────────────────┘
```

---

## 2. Página: Home (`/home`)

### Mobile (atual — não alterar)
Coluna única `max-w-lg`, header com ícones, seções empilhadas.

### Desktop (adicionar)

Layout de **duas colunas**:
- Coluna principal (esquerda): Destaques da semana + Em alta nos canais
- Coluna lateral (direita, 280px fixo): Seus espaços + atalhos rápidos

```
lg:grid lg:grid-cols-[1fr_280px] lg:gap-6 lg:max-w-5xl lg:mx-auto lg:px-8 lg:pt-8
```

**Header desktop:** remover os ícones de atalho (Salvo, Mensagens, Notificações) do header — eles ficam na sidebar. Manter apenas o Logo centralizado ou remover o header inteiro em desktop.

**Cards de destaque em desktop:** aumentar thumbnail de `w-20 h-20` para `lg:w-28 lg:h-28`, título com `lg:text-base`, remover `line-clamp-3` → `lg:line-clamp-2`.

**Coluna direita (Seus espaços):**
- Sticky: `lg:sticky lg:top-8 lg:self-start`
- Grid de espaços: `grid-cols-2` mobile → `lg:grid-cols-1` (lista vertical na sidebar direita)
- Cada item: ícone + nome + badge de atualizações

---

## 3. Página: SpaceDetail (`/spaces/:slug`)

### Mobile (atual — não alterar)
Coluna única `max-w-lg`, cards empilhados.

### Desktop (adicionar)

Layout de **duas colunas**:
- Coluna principal: feed de artigos
- Coluna lateral direita (280px): info do espaço + espaços relacionados

```
lg:grid lg:grid-cols-[1fr_280px] lg:gap-6 lg:max-w-5xl lg:mx-auto lg:px-8
```

**Cards de artigo em desktop:**
- Thumbnail: `w-20 h-20` → `lg:w-32 lg:h-24`
- Título: `lg:text-base lg:line-clamp-2`
- Mostrar excerpt (primeiras 2 linhas do conteúdo) em desktop — atualmente não existe, mas pode ser adicionado como campo `excerpt` ou truncando o content

**Coluna direita:**
```
┌─────────────────────┐
│  [Ícone] Nome       │  ← info do espaço atual
│  Descrição          │
│  X atualizações     │
│  ─────────────────  │
│  Outros espaços     │  ← lista de outros espaços para navegar
└─────────────────────┘
```

---

## 4. Página: PostDetail (`/spaces/:slug/post/:slug`)

Esta é a página mais crítica para desktop — é onde o usuário passa mais tempo.

### Mobile (atual — não alterar)
Full-width, `max-w-2xl mx-auto px-5`.

### Desktop (adicionar)

Layout de **três colunas** (padrão Medium/Substack):

```
┌──────────┬──────────────────────────┬──────────┐
│ [Sidebar]│  [Artigo — max-w-680px]  │ [Right]  │
│  240px   │                          │  240px   │
└──────────┴──────────────────────────┴──────────┘
```

**Coluna central (artigo):**
- `lg:max-w-[680px] lg:mx-auto`
- Tipografia maior: `prose-base lg:prose-lg`
- Título: `text-2xl sm:text-3xl` → `lg:text-4xl`
- Line-height do corpo: `lg:leading-[1.8]`
- Fonte do corpo: manter DM Sans, mas aumentar para `lg:text-[17px]`
- Padding lateral: `px-5` → `lg:px-0` (a coluna já tem largura definida)

**Coluna direita (sticky):**
```
┌─────────────────────┐
│  Engajamento        │  ← likes + comentários (vertical)
│  ❤ 42               │
│  💬 8                │
│  🔖 Salvar          │
│  ─────────────────  │
│  Sobre o autor      │  ← avatar + nome + bio curta
│  ─────────────────  │
│  Artigos do espaço  │  ← 3 artigos relacionados
└─────────────────────┘
```

**PostHeader em desktop:**
- Remover o header fixo com botão voltar e título — em desktop o título está visível no artigo
- Substituir por uma topbar minimalista apenas com botão voltar e breadcrumb: `Espaços > Nome do Espaço > Título`

**Hero image em desktop:**
- `aspect-video` → `lg:aspect-[21/9]` para imagem mais panorâmica
- Ou manter `aspect-video` mas limitar a `lg:max-h-[480px]`

---

## 5. Página: Highlights (`/highlights`)

### Mobile (atual — não alterar)
Sticky header com filtros horizontais scroll, lista de cards.

### Desktop (adicionar)

- Filtros de data: scroll horizontal → `lg:flex lg:flex-wrap lg:gap-2` (todos visíveis)
- Cards: coluna única → `lg:grid lg:grid-cols-2 lg:gap-4`
- Cada card em desktop: thumbnail maior `lg:w-32 lg:h-24`, título `lg:text-base`
- Container: `lg:max-w-4xl lg:mx-auto lg:px-8`

---

## 6. Página: Spaces (`/spaces`)

### Mobile (atual — não alterar)
Lista vertical de cards.

### Desktop (adicionar)

- Container: `lg:max-w-4xl lg:mx-auto lg:px-8`
- Cards de espaço: lista vertical → `lg:grid lg:grid-cols-2 lg:gap-4`
- Cada card em desktop: ícone maior, descrição sem `line-clamp-2` (mostrar completa)

---

## 7. Página: Channels (`/channels`)

### Mobile (atual — não alterar)
Lista vertical de cards.

### Desktop (adicionar)

- Container: `lg:max-w-4xl lg:mx-auto lg:px-8`
- Cards: lista vertical → `lg:grid lg:grid-cols-2 lg:gap-4`
- Cada card: mostrar mais metadados (membros, posts, última atividade) com mais espaço

---

## 8. Página: ChannelDetail (`/channels/:id`)

### Desktop (adicionar)

Layout de **duas colunas**:
- Principal: feed de posts
- Lateral direita: info do canal + botão publicar + membros ativos

```
lg:grid lg:grid-cols-[1fr_260px] lg:gap-6 lg:max-w-5xl lg:mx-auto lg:px-8
```

---

## 9. Página: Podcasts (`/podcasts`)

### Desktop (adicionar)

- Container: `lg:max-w-4xl lg:mx-auto lg:px-8`
- Cards: lista vertical → `lg:grid lg:grid-cols-2 lg:gap-4`
- Filtros de espaço: scroll horizontal → `lg:flex lg:flex-wrap`

---

## 10. Página: Events (`/events`)

### Desktop (adicionar)

- Container: `lg:max-w-5xl lg:mx-auto lg:px-8`
- Cards de evento: lista vertical → `lg:grid lg:grid-cols-2 lg:gap-6`
- Filtros: dropdowns lado a lado → `lg:flex lg:gap-3 lg:items-center`
- Cover image: `h-40` → `lg:h-52`

---

## 11. Página: AI Assistant (`/ai-assistant`)

### Desktop (adicionar)

- Remover `fixed inset-0` em desktop — usar layout normal com sidebar
- Container: `lg:max-w-3xl lg:mx-auto lg:h-[calc(100vh-0px)]`
- Input area: `pb-28` (mobile, por causa do BottomNav) → `lg:pb-6`
- Área de mensagens: mais espaço, mensagens com `lg:max-w-[70%]`

---

## 12. Página: Messages (`/messages`)

### Desktop (adicionar)

Layout de **duas colunas** (padrão de chat):
- Coluna esquerda (lista de conversas): `lg:w-80 lg:border-r lg:border-border`
- Coluna direita (conversa ativa): área principal

```
lg:grid lg:grid-cols-[320px_1fr] lg:h-[calc(100vh-0px)] lg:max-w-5xl lg:mx-auto
```

Em mobile, `/messages` mostra a lista e `/messages/:id` mostra a conversa. Em desktop, ambas ficam lado a lado.

---

## 13. Página: Profile (`/profile`)

### Desktop (adicionar)

- Container: `lg:max-w-2xl lg:mx-auto lg:px-8`
- Header do perfil: avatar maior `lg:h-20 lg:w-20`, nome em `lg:text-2xl`
- Menu items: lista vertical → `lg:grid lg:grid-cols-2 lg:gap-3`

---

## 14. Página: Plans (`/plans`)

### Desktop (adicionar)

- Container: `lg:max-w-2xl lg:mx-auto`
- Planos: empilhados → `lg:grid lg:grid-cols-3 lg:gap-4` (os 3 planos lado a lado)
- Cada card de plano: altura igual com `lg:h-full`

---

## 15. Página: Landing (`/`)

A landing já tem boa responsividade. Ajustes pontuais:

- Hero: `text-3xl sm:text-4xl lg:text-5xl` → já existe, manter
- PhoneMockupCarousel: em desktop pode mostrar 2 mockups lado a lado
- Seções de conteúdo: `lg:max-w-5xl lg:mx-auto`
- LandingFeatures: grid `lg:grid-cols-3`
- LandingSpaces: grid `lg:grid-cols-3`

---

## Componentes Compartilhados a Criar

### `DesktopSidebar` (novo)
```
src/components/DesktopSidebar.tsx
```
- Logo no topo
- NavItems verticais (mesmos do BottomNav)
- Badges de não lidos em Mensagens e Notificações
- Perfil do usuário no rodapé (avatar + nome + link para /profile)
- Indicador de trial se ativo

### `PageContainer` (novo — opcional)
Wrapper que aplica o grid correto por breakpoint, evitando repetir `lg:grid lg:grid-cols-[1fr_280px]` em cada página:

```tsx
// Uso:
<PageContainer sidebar={<RightSidebar />}>
  {/* conteúdo principal */}
</PageContainer>
```

### `RightSidebarCard` (novo — opcional)
Card padronizado para a coluna direita com título e conteúdo.

---

## Regras de Implementação

### O que NÃO fazer
- Não remover `max-w-lg` existente — adicionar `lg:max-w-none` ou `lg:max-w-5xl` por cima
- Não alterar `pb-20` do mobile — adicionar `lg:pb-0`
- Não tocar em `pt-safe` — é necessário para iOS
- Não remover `BottomNav` — apenas ocultá-lo com `lg:hidden`
- Não alterar animações Framer Motion existentes

### O que fazer
- Sempre usar prefixo `lg:` para estilos desktop
- Testar em 1280px, 1440px e 1920px
- Manter `max-w-lg mx-auto` como fallback para telas entre 768px e 1023px
- Usar `lg:sticky lg:top-8` para colunas laterais que devem seguir o scroll

### Ordem de implementação sugerida

| Prioridade | Componente | Impacto |
|------------|------------|---------|
| 1 | `AppLayout` + `DesktopSidebar` | Base de tudo |
| 2 | `PostDetail` | Página mais visitada |
| 3 | `SpaceDetail` | Segunda mais visitada |
| 4 | `Home` | Feed principal |
| 5 | `Highlights` | Descoberta de conteúdo |
| 6 | `Channels` + `ChannelDetail` | Comunidade |
| 7 | `Podcasts` + `Events` | Conteúdo secundário |
| 8 | `Plans` | Conversão |
| 9 | `Profile` + `Messages` | Configurações |

---

## Referências de Design

Plataformas com padrão similar para referência:
- **Substack** — sidebar esquerda + artigo central + coluna direita com autor
- **Medium** — artigo centralizado com tipografia generosa + coluna direita sticky
- **The Browser Company** — sidebar minimalista + conteúdo principal
- **Linear** — sidebar fixa + área de conteúdo com grid interno

O Subhumano tem tema escuro (background `#000`, card `#0f0f0f`) — manter essa identidade em todos os novos elementos desktop.
