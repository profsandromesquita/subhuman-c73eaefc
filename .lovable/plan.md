
# Plano: Alterar Aspect Ratio da Capa do Podcast para 16:9

## Problema Identificado

A imagem da capa do podcast está exibida em formato quadrado (1:1) devido à classe `aspect-square` no componente `PodcastPlayer.tsx`.

## Solução

Alterar o aspect ratio para 16:9 (equivalente a 1920x1080) usando a classe `aspect-video` do Tailwind CSS.

---

## Arquivo a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/podcast/PodcastPlayer.tsx` | Trocar `aspect-square` por `aspect-video` |

---

## Alteração Específica

**Linha 111** - Alterar de:
```tsx
<div className="aspect-square w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-secondary">
```

Para:
```tsx
<div className="aspect-video w-full rounded-2xl overflow-hidden bg-secondary">
```

### Mudanças:
1. `aspect-square` → `aspect-video` (16:9)
2. Remover `max-w-sm` para permitir que a imagem ocupe a largura total disponível em mobile

---

## Resultado Visual

```text
ANTES (1:1):                    DEPOIS (16:9):
┌──────────────────┐            ┌──────────────────────────┐
│                  │            │                          │
│                  │            │        CAPA 16:9         │
│    CAPA 1:1      │            │                          │
│                  │            └──────────────────────────┘
│                  │
└──────────────────┘
```

---

## Escopo

- **1 arquivo** modificado
- **1 linha** alterada
- Mantém todos os outros comportamentos do player
