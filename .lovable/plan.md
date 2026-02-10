

# Correcoes: Logo cortada, Input IA sobreposto, Miniatura Podcast no lock screen

## 1. Logo cortada na Landing Page (imagem 1)

**Causa**: A secao hero usa `min-h-screen flex items-center justify-center`, centralizando verticalmente o conteudo. A logo `xl` (h-32) com `mb-12` fica muito proxima do topo da tela em dispositivos moveis, sendo cortada pela barra de status do iOS.

**Solucao**: Adicionar `pt-16` (padding-top) na secao hero para garantir espaco seguro acima da logo no mobile.

| Arquivo | Mudanca |
|---------|---------|
| `src/components/landing/LandingHero.tsx` | Adicionar `pt-16` na section (linha 10) |

---

## 2. Caixa de texto da IA sobreposta pelo menu inferior (imagem 2)

**Causa**: O input area usa `pb-20` (linha 219), mas a bottom nav (h-16 + safe-area) pode ser maior em dispositivos com home indicator (iPhone). O input fica parcialmente escondido atras da nav.

**Solucao**: Aumentar o `pb-20` para `pb-24` e adicionar `pb-safe` para garantir espaco suficiente em todos os dispositivos iOS.

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/AIAssistant.tsx` | Alterar `pb-20` para `pb-28` no container do input (linha 219) |

---

## 3. Miniatura do podcast na tela de bloqueio (imagem 3)

**Causa**: O player nao utiliza a Media Session API do navegador. Por padrao, o iOS/Android mostra o icone do PWA (logo do Subhumano) na tela de bloqueio.

**Solucao**: Implementar a `navigator.mediaSession` API no componente `PodcastPlayer`, configurando:
- `metadata.title` com o titulo do episodio
- `metadata.artist` com "Subhumano"
- `metadata.artwork` com a `coverUrl` do episodio (em multiplos tamanhos)
- Action handlers para play, pause, seekbackward, seekforward

| Arquivo | Mudanca |
|---------|---------|
| `src/components/podcast/PodcastPlayer.tsx` | Adicionar useEffect com navigator.mediaSession metadata e action handlers |

Codigo relevante:
```tsx
useEffect(() => {
  if (!("mediaSession" in navigator)) return;
  
  navigator.mediaSession.metadata = new MediaMetadata({
    title: title,
    artist: "Subhumano",
    album: "Podcast",
    artwork: coverUrl
      ? [
          { src: coverUrl, sizes: "96x96", type: "image/png" },
          { src: coverUrl, sizes: "128x128", type: "image/png" },
          { src: coverUrl, sizes: "192x192", type: "image/png" },
          { src: coverUrl, sizes: "256x256", type: "image/png" },
          { src: coverUrl, sizes: "384x384", type: "image/png" },
          { src: coverUrl, sizes: "512x512", type: "image/png" },
        ]
      : [],
  });

  navigator.mediaSession.setActionHandler("play", () => { /* toggle play */ });
  navigator.mediaSession.setActionHandler("pause", () => { /* toggle pause */ });
  navigator.mediaSession.setActionHandler("seekbackward", () => skip(-15));
  navigator.mediaSession.setActionHandler("seekforward", () => skip(15));
}, [title, coverUrl]);
```

---

## 4. Indicador de "ja ouvido" nos podcasts (imagem 4 - Spotify-style)

**Causa**: Nao existe rastreamento de progresso de escuta dos podcasts.

**Solucao**: Criar uma tabela `podcast_listens` no banco de dados para rastrear o progresso de escuta por usuario. Adicionar um indicador visual (check verde) no `PodcastCard` quando o episodio foi ouvido ate o final (>90% de progresso).

### Banco de dados
Nova tabela `podcast_listens`:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `podcast_id` (uuid, FK podcasts)
- `progress_seconds` (integer, default 0)
- `completed` (boolean, default false)
- `updated_at` (timestamptz)
- Constraint UNIQUE(user_id, podcast_id)
- RLS: usuario so le/escreve seus proprios registros

### Componentes alterados

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | Criar tabela `podcast_listens` com RLS |
| `src/hooks/usePodcasts.ts` | Adicionar hooks `useTrackListen` e `useListenedPodcasts` |
| `src/components/podcast/PodcastPlayer.tsx` | Salvar progresso periodicamente e marcar como completo em >90% |
| `src/components/podcast/PodcastCard.tsx` | Mostrar icone de check verde quando `completed = true` |

O PodcastCard mostrara um pequeno icone de check (CheckCircle) verde no canto da miniatura quando o podcast ja foi ouvido completamente.

---

## Resumo

| # | Problema | Arquivo(s) | Tipo |
|---|----------|-----------|------|
| 1 | Logo cortada | LandingHero.tsx | CSS |
| 2 | Input IA sobreposto | AIAssistant.tsx | CSS |
| 3 | Miniatura lock screen | PodcastPlayer.tsx | Media Session API |
| 4 | Check "ja ouvido" | DB + PodcastPlayer + PodcastCard + usePodcasts | Feature nova |
