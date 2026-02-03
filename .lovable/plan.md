
# Plano: Padronizar Margens das Páginas

## Problema Identificado

As páginas **Podcasts**, **PodcastDetail** e **Home** estão fora do padrão de layout usado nas outras páginas do app.

### Padrão Correto (usado em Spaces.tsx e Channels.tsx)

```jsx
<AppLayout>
  <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
    {/* conteúdo */}
  </div>
</AppLayout>
```

| Classe | Função |
|--------|--------|
| `max-w-lg` | Largura máxima do container (mobile-first) |
| `mx-auto` | Centraliza horizontalmente |
| `px-4` | Padding horizontal de 16px |
| `pt-8` | Padding top de 32px |
| `pb-24` | Padding bottom para bottom navigation |

### Páginas Fora do Padrão

| Página | Container Atual | Problema |
|--------|-----------------|----------|
| `Podcasts.tsx` | `<div className="space-y-6">` | Sem margens, sem max-width |
| `PodcastDetail.tsx` | `<div className="space-y-6">` | Sem margens, sem max-width |
| `Home.tsx` | `<div className="p-4 space-y-6 pb-24">` | Sem max-width, sem mx-auto, sem pt-8 |

## Alterações Necessárias

### 1. `src/pages/Podcasts.tsx` (linha 14)

**De:**
```jsx
<div className="space-y-6">
```

**Para:**
```jsx
<div className="max-w-lg mx-auto px-4 pt-8 pb-24 space-y-6">
```

### 2. `src/pages/PodcastDetail.tsx` (linhas 19, 33, 57)

Aplicar o container padrão nos três estados (loading, not found, sucesso):

**Loading state (linha 19):**
```jsx
<div className="max-w-lg mx-auto px-4 pt-8 pb-24 space-y-6 animate-pulse">
```

**Not found state (linha 33):**
```jsx
<div className="max-w-lg mx-auto px-4 pt-8 pb-24 flex flex-col items-center justify-center py-16 text-center">
```

**Success state (linha 57):**
```jsx
<div className="max-w-lg mx-auto px-4 pt-8 pb-24 space-y-6">
```

### 3. `src/pages/Home.tsx` (linha 97)

**De:**
```jsx
<div className="p-4 space-y-6 pb-24">
```

**Para:**
```jsx
<div className="max-w-lg mx-auto px-4 pt-8 pb-24 space-y-6">
```

## Resultado Esperado

Todas as páginas terão:
- Conteúdo centralizado com largura máxima consistente
- Margens horizontais de 16px (px-4)
- Espaçamento superior de 32px (pt-8)
- Espaçamento inferior adequado para bottom navigation (pb-24)
