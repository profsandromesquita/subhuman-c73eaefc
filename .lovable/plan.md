

# Padronizar PodcastCard para seguir o formato visual de /highlights

## Diferenças identificadas

| Aspecto | Highlights | Podcast (atual) |
|---|---|---|
| Wrapper | `Card` com `p-3 lg:p-4` | `Link` sem Card |
| Ordem | Texto à esquerda, thumbnail à direita | Thumbnail à esquerda, texto à direita |
| Badge/categoria | `Badge` com nome do espaço no topo | Tags `#tag` misturadas no rodapé |
| Título | `line-clamp-2`, `font-medium text-sm` | `line-clamp-1` mobile / `line-clamp-2` desktop, `font-semibold` |
| Descrição | Não exibe | Exibe `line-clamp-2` |
| Metadata | Likes · Comments · Tempo · Read time | Likes · Comments · Espaço · Tempo relativo |
| Extras podcast | — | Duração sobre a cover, progress bar, ícone listened |

## Plano (1 arquivo: `src/components/podcast/PodcastCard.tsx`)

Reescrever o PodcastCard para seguir a mesma estrutura do card de highlights, preservando dados específicos de podcast:

1. **Wrapper**: Trocar `Link` por `Card` dentro de um `Link` (ou usar `Card` com `onClick` + `useNavigate`, como highlights faz)
2. **Layout**: Texto à esquerda, thumbnail à direita — mesma ordem de highlights
3. **Badge**: Espaço do podcast (`podcast.spaces?.name`) como `Badge` no topo do bloco de texto, antes do título
4. **Título**: `font-medium text-sm line-clamp-2 lg:text-[15px]` — mesmo estilo de highlights
5. **Sem descrição**: Remover `podcast.description` do card (highlights não mostra)
6. **Metadata**: Mesmo layout de highlights — likes, comments, duração (no lugar de read time), tempo relativo
7. **Thumbnail**: Mover para a direita, manter `w-20 h-20 lg:w-24 lg:h-24 rounded-xl lg:rounded-2xl`. Manter badge de duração e ícone de listened sobre a imagem
8. **Progress bar**: Manter na base do card (funcionalidade específica de podcast)
9. **Tags**: Remover do card para manter consistência (ou opcionalmente exibir 1 tag como badge secundário)

Resultado: card visualmente idêntico ao de highlights, com duração e progress bar como únicas diferenças funcionais.

