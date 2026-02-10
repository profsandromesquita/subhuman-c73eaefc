# Otimização de Performance — Status

## FASE 1 — ✅ CONCLUÍDA

- ✅ Views `space_update_stats` e `channel_post_stats` criadas
- ✅ Coluna `read_time_minutes` + trigger + backfill
- ✅ RPC `get_unread_notifications_count` criada
- ✅ `usePosts.ts` refatorado (views em vez de contagem client-side, sem `content` nas listagens)
- ✅ `PostDetail.tsx` migrado para React Query (`usePostDetail` hook)
- ✅ `Highlights.tsx` migrado para React Query (`useHighlightsFiltered` hook)

## FASE 2 — ✅ CONCLUÍDA

- ✅ Google Font via `<link rel="preconnect">` no `index.html` (removido `@import`)
- ✅ `loading="lazy"` em imagens de cards (Home, SpaceDetail, Highlights)
- ✅ GradientOrbs: `will-change-transform` + `hidden md:block`
- ✅ `useUnreadNotificationsCount` usando RPC (1 query em vez de 3)

## FASE 3 — PENDENTE (escala futura)

- Paginação com `useInfiniteQuery` no `useSpaceUpdates`
- Paginação no Highlights
- Configurar `vite-plugin-pwa` no `vite.config.ts`
- `prefers-reduced-motion` para Framer Motion
