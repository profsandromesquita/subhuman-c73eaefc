

# Plano: Corrigir hero (remover embed) + thumbnails automáticas nos materiais

## Diagnóstico

**Causa raiz do embed indevido**: Linhas 97-99 fazem fallback para `materials.find(m => m.type === "video")?.url`, e linhas 220-233 renderizam um iframe com esse ID. Mesmo com `youtube_url` vazio no evento, o vídeo do material aparece como embed no hero.

## Mudanças — Arquivo único: `src/pages/EventDetail.tsx`

### 1. Remover lógica de embed do YouTube

- Remover linhas 96-101 (`youtubeUrl`, `youtubeId`, fallback de materiais)
- Remover linhas 219-236 (bloco do iframe + fallback de cover)
- Remover linhas 238-245 (mensagem contextual que dependia de `youtubeUrl`)
- Remover a função `extractYouTubeId` (linhas 13-27) — será movida para uso apenas no `MaterialCard`

### 2. Hero com imagem de capa

Substituir o bloco de vídeo/cover por:

```tsx
{event.cover_url ? (
  <img src={event.cover_url} alt={event.title} className="w-full rounded-xl object-cover max-h-80" />
) : (
  <div className="w-full rounded-xl bg-secondary flex items-center justify-center" style={{ aspectRatio: "16/9" }}>
    <CalendarBlank className="w-12 h-12 text-muted-foreground/50" />
  </div>
)}
```

### 3. MaterialCard — thumbnail automática do YouTube

Mover `extractYouTubeId` para dentro do escopo do `MaterialCard` (ou mantê-la no topo como utilitário, mas usada apenas aqui). Alterar a lógica de thumbnail:

```tsx
function MaterialCard({ material }: { material: EventMaterial }) {
  const Icon = materialIcons[material.type] || Play;

  // Gerar thumbnail automática para vídeos do YouTube
  let thumbnailUrl = material.thumbnail_url;
  if (!thumbnailUrl && material.type === "video" && material.url) {
    const videoId = extractYouTubeId(material.url);
    if (videoId) {
      thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  }

  return (
    <a ...>
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt={material.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-secondary ...">
          <Icon ... />
        </div>
      )}
      ...
    </a>
  );
}
```

### 4. Cleanup

- Remover variáveis `meetUrl`, `youtubeUrl`, `youtubeId`, `showMeetButton` — o botão "Entrar na Sala ao Vivo" usará `event.meet_url` diretamente
- Manter `extractYouTubeId` no topo do arquivo (usada pelo `MaterialCard`)
- Mensagem contextual simplificada: mostrar quando `materials.length === 0` e não há cover

## O que NÃO muda

- Hook `useEventDetail`, `EventActionButtons`, `Events.tsx`, banco, RLS
- Badges, descrição colapsável, metadados, seção de materiais (estrutura)
- Botão "Entrar na Sala ao Vivo" — mantém mesma lógica (`meet_url && !isPast`)

