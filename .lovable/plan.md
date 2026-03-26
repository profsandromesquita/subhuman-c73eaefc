

# Plano: Fallback do player para primeiro material de vídeo

## Diagnóstico

O problema é simples: o campo `youtube_url` na tabela `events` está **NULL** para o evento "Crie seu site em 6h usando IA". A URL do YouTube (`https://www.youtube.com/watch?v=UvgB3hDrd1A`) foi cadastrada como **material** (na tabela `event_materials`), não no campo `youtube_url` do evento.

O player depende exclusivamente de `event.youtube_url` (linha 97), que está vazio — por isso mostra o fallback de imagem de capa.

## Correção

### Arquivo: `src/pages/EventDetail.tsx`

Alterar a derivação de `youtubeUrl` (linhas 96-99) para incluir fallback:

```typescript
const meetUrl = event?.meet_url;

// Prioridade: youtube_url do evento → URL do primeiro material tipo "video"
const youtubeUrl = event?.youtube_url 
  || materials.find((m) => m.type === "video")?.url 
  || null;

const youtubeId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;
```

Isso é tudo. A lógica de renderização do player (linha 218) já usa `youtubeId`, então vai funcionar automaticamente.

### Comportamento resultante

- Evento com `youtube_url` preenchido → usa esse (prioridade)
- Evento sem `youtube_url` mas com material tipo "video" com URL do YouTube → player aparece com o primeiro vídeo
- Evento sem nenhum dos dois → imagem de capa como fallback

### Arquivo único alterado

- `src/pages/EventDetail.tsx` — 1 linha alterada

