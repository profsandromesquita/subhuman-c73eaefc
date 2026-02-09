

# Ajustar imagem do Prof. Sandro — largura total + overlay com hover

## Problema

A imagem do Prof. Sandro esta pequena (w-48 h-56) e destoa dos cards abaixo que ocupam a largura total do grid (3 colunas no desktop).

## Solucao

No arquivo `src/components/landing/LandingAuthor.tsx` (linhas 49-57):

### 1. Expandir a imagem para largura total
- Remover `w-48 h-56` e `flex flex-col items-center`
- Usar `w-full` com uma altura fixa responsiva (`h-64 sm:h-80 lg:h-96`)
- Manter `rounded-xl overflow-hidden`

### 2. Adicionar overlay preto 50% com hover
- Usar `position: relative` no container da imagem
- Adicionar um `div` absoluto por cima com `bg-black/50` (50% de transparencia)
- No hover, transicionar para `bg-black/0` (transparencia total)
- Usar `transition-all duration-500` para suavizar

### Codigo resultante (linhas 49-62 aproximadamente)

```tsx
<div className="relative w-full h-64 sm:h-80 lg:h-96 rounded-xl overflow-hidden ring-2 ring-foreground/20 mb-4 group">
  <img
    src={profSandro}
    alt="Prof. Sandro Mesquita"
    className="w-full h-full object-cover"
    loading="lazy"
  />
  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/0 transition-all duration-500" />
</div>
```

- Remover `hover:scale-105` e `transition-transform` do container antigo
- Manter os badges centralizados abaixo normalmente

## Arquivo alterado

| Arquivo | Mudanca |
|---------|---------|
| `src/components/landing/LandingAuthor.tsx` | Imagem full-width + overlay preto 50% com hover reveal |

