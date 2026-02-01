

# Plano de Correção: Safe Areas para iPhone

## Problema Identificado

No iPhone 15 Pro Max (e outros modelos com Dynamic Island/notch), o conteúdo da aplicação está sendo renderizado por baixo da barra de status do sistema (hora, câmera, Dynamic Island), tornando elementos no topo da tela inacessíveis.

### Causa Raiz

| Aspecto | Estado Atual | Problema |
|---------|--------------|----------|
| Viewport | `viewport-fit=cover` | Permite renderizar na área do notch/Dynamic Island |
| CSS Safe Areas | Apenas `safe-area-pb` (bottom) | Falta `safe-area-pt` (top) e laterais |
| AppLayout | `min-h-screen` sem padding top | Conteúdo começa no topo absoluto |
| Headers fixos | `top-0` sem offset | Ficam sob a barra de status |

### Elementos Afetados

| Local | Elemento | Impacto |
|-------|----------|---------|
| Login/Register | Botão "Voltar" | Inacessível |
| SpaceDetail | Botão "Voltar" + título | Inacessível |
| ChannelDetail | Botão "Voltar" + header | Inacessível |
| PostDetail | Header fixo com ações | Inacessível |
| Páginas gerais | Logo e títulos | Parcialmente ocultados |

## Solução Proposta

### Estratégia de Implementação

Usar **CSS environment variables** (`env(safe-area-inset-*)`) que o iOS fornece automaticamente para indicar as áreas "seguras" da tela.

```text
┌────────────────────────────────────────┐
│ ████████ Dynamic Island ████████████  │ ← env(safe-area-inset-top)
├────────────────────────────────────────┤
│                                        │
│   ┌────────────────────────────────┐   │
│   │                                │   │
│   │   ÁREA SEGURA DO CONTEÚDO     │   │
│   │                                │   │
│   │   (onde elementos devem estar) │   │
│   │                                │   │
│   └────────────────────────────────┘   │
│                                        │
├────────────────────────────────────────┤
│ ████████ Home Indicator ███████████   │ ← env(safe-area-inset-bottom)
└────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `index.html` | Adicionar classe CSS `.safe-area-pt` para padding-top |
| `src/index.css` | Definir classes utilitárias para safe areas |
| `src/components/AppLayout.tsx` | Adicionar safe-area-inset-top no container principal |
| `src/components/BottomNav.tsx` | Já tem safe-area-pb (OK) |
| `src/components/post/PostHeader.tsx` | Adicionar padding-top para safe area em header fixo |
| `src/pages/Login.tsx` | Adicionar safe area no container |
| `src/pages/Register.tsx` | Adicionar safe area no container |
| `src/pages/Landing.tsx` | Adicionar safe area no container |
| `src/pages/SpaceDetail.tsx` | Herda de AppLayout (será corrigido automaticamente) |
| `src/pages/ChannelDetail.tsx` | Herda de AppLayout (será corrigido automaticamente) |
| `src/pages/PostDetail.tsx` | Adicionar safe area no container (não usa AppLayout) |

## Implementação Detalhada

### 1. Atualizar `index.html`

Adicionar classes utilitárias para todas as safe areas:

```html
<style>
  .safe-area-pt {
    padding-top: env(safe-area-inset-top, 0);
  }
  .safe-area-pb {
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  .safe-area-insets {
    padding-top: env(safe-area-inset-top, 0);
    padding-bottom: env(safe-area-inset-bottom, 0);
    padding-left: env(safe-area-inset-left, 0);
    padding-right: env(safe-area-inset-right, 0);
  }
</style>
```

### 2. Atualizar `src/index.css`

Adicionar utilitários Tailwind-like para safe areas:

```css
@layer utilities {
  .pt-safe {
    padding-top: env(safe-area-inset-top, 0);
  }
  
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  
  .px-safe {
    padding-left: env(safe-area-inset-left, 0);
    padding-right: env(safe-area-inset-right, 0);
  }
  
  .top-safe {
    top: env(safe-area-inset-top, 0);
  }
}
```

### 3. Atualizar `src/components/AppLayout.tsx`

Adicionar safe-area no container principal:

```tsx
// Antes
<div className="min-h-screen bg-background">
  <main className={showNav ? "pb-20" : ""}>
    {children}
  </main>
  ...
</div>

// Depois
<div className="min-h-screen bg-background pt-safe">
  <main className={showNav ? "pb-20" : ""}>
    {children}
  </main>
  ...
</div>
```

### 4. Atualizar `src/components/post/PostHeader.tsx`

Ajustar header fixo para respeitar safe area:

```tsx
// Antes
<motion.header
  className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md"
>
  <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">

// Depois
<motion.header
  className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md pt-safe"
>
  <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
```

### 5. Atualizar páginas sem AppLayout

**Login.tsx, Register.tsx, Landing.tsx:**
```tsx
// Antes
<div className="min-h-screen bg-background">
  <div className="relative max-w-lg mx-auto px-6 pt-8 pb-12">

// Depois
<div className="min-h-screen bg-background pt-safe">
  <div className="relative max-w-lg mx-auto px-6 pt-8 pb-12">
```

**PostDetail.tsx:**
```tsx
// No container principal, adicionar pt-safe
<div className="min-h-screen bg-background pt-safe">
  ...
</div>
```

### 6. Ajustar padding do conteúdo em PostDetail

Como o header terá padding-top para a safe area, o conteúdo precisa considerar isso:

```tsx
// Aumentar pt-14 para pt-[calc(3.5rem+env(safe-area-inset-top))]
// Ou usar uma classe customizada
```

## Seção Técnica

### Como `env(safe-area-inset-*)` funciona

| Variable | iPhone SE | iPhone 15 Pro Max | Android |
|----------|-----------|-------------------|---------|
| `safe-area-inset-top` | 20px | ~59px (Dynamic Island) | 0-24px |
| `safe-area-inset-bottom` | 0px | ~34px (Home Indicator) | 0-48px |
| `safe-area-inset-left` | 0px | 0px | Varia |
| `safe-area-inset-right` | 0px | 0px | Varia |

### Fallback para navegadores sem suporte

A sintaxe `env(safe-area-inset-top, 0)` inclui fallback de `0` para navegadores que não suportam essas variáveis.

### Compatibilidade

- iOS Safari: Suporte total
- Chrome Android: Suporte parcial (depende do dispositivo)
- Desktop: Ignora (valores são 0)

## Fluxo Visual Após Correção

```text
iPhone 15 Pro Max:
┌────────────────────────────────────────┐
│ ████ 14:30 ████ Dynamic Island        │ ← Status bar do sistema
├────────────────────────────────────────┤
│                                        │ ← padding-top: env(safe-area-inset-top)
│  ← [Voltar]        [Logo]              │ ← Elementos agora acessíveis!
│                                        │
│  Título da Página                      │
│  Conteúdo...                           │
│                                        │
│                                        │
├────────────────────────────────────────┤
│  [Início] [Espaços] [Canais] [Perfil]  │ ← BottomNav (já tem safe-area-pb)
│ ──────────────────────────────────────  │ ← Home indicator
└────────────────────────────────────────┘
```

## Ordem de Implementação

1. Adicionar classes CSS em `index.html` e `src/index.css`
2. Atualizar `AppLayout.tsx` (corrige Home, Spaces, Channels, Notifications, Profile)
3. Atualizar `PostHeader.tsx` (corrige headers fixos em detalhes de posts)
4. Atualizar `PostDetail.tsx` (não usa AppLayout)
5. Atualizar `Login.tsx`, `Register.tsx`, `Landing.tsx` (páginas de auth)

## Resultado Esperado

Após implementação:

1. Todos os botões de voltar serão clicáveis no iPhone
2. Headers fixos respeitarão a área do Dynamic Island
3. Conteúdo não ficará escondido sob a barra de status
4. Experiência consistente entre iPhone SE, 15, 15 Pro Max
5. Sem impacto visual em dispositivos sem notch (fallback 0)

