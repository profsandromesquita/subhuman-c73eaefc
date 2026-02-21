

# Mostrar curtidas e comentários nos cards de podcast

## Problema

Os cards de podcast na página `/podcasts` não exibem contagem de curtidas nem de comentários. O usuário precisa abrir cada episódio para ver essas informações.

## Solução

Buscar as contagens de curtidas e comentários de todos os podcasts listados em uma única query batch e exibi-las no componente `PodcastCard`.

## Alterações

### 1. Novo hook: `src/hooks/usePodcastStats.ts`

Criar um hook que recebe uma lista de IDs de podcasts e retorna um Map com `likesCount` e `commentsCount` para cada um. Faz duas queries em paralelo:
- `podcast_likes` agrupado por `podcast_id` (count)
- `podcast_comments` agrupado por `podcast_id` (count)

### 2. Arquivo: `src/pages/Podcasts.tsx`

- Importar o novo hook `usePodcastStats`
- Passar a lista de IDs dos podcasts carregados para o hook
- Repassar `likesCount` e `commentsCount` como props para cada `PodcastCard`

### 3. Arquivo: `src/components/podcast/PodcastCard.tsx`

- Adicionar props opcionais `likesCount` e `commentsCount`
- Renderizar os contadores abaixo das tags, ao lado do nome do espaço e timestamp
- Usar ícones `Heart` e `ChatCircle` do Phosphor Icons (outline, consistente com o design system)
- Formato: `3` ao lado do ícone de coração, `5` ao lado do ícone de comentário

---

## Detalhes técnicos

O hook faz as queries com `.in("podcast_id", podcastIds)` e conta no frontend agrupando por `podcast_id`. Isso evita N+1 queries e mantém o padrão de performance da plataforma.

Visualmente, os contadores ficam discretos (text-xs text-muted-foreground) na mesma linha do espaço e timestamp.
