

# Plano: TTS com Storage — geração na publicação, reprodução via URL

## Resumo

Migrar o TTS de geração em tempo real (Edge Function → blob → Audio) para geração na publicação com armazenamento no Storage. O áudio é servido como URL pública, eliminando problemas de autoplay policy, cold start, timeout e retry.

8 etapas, 7 arquivos alterados/criados, 2 arquivos removidos.

---

## Etapa 1 — Migration: `audio_url` na tabela `space_updates`

SQL migration adicionando coluna `audio_url text null` e índice parcial para backfill.

## Etapa 2 — Bucket `article-audio` no Storage

SQL migration criando bucket público com limite de 50MB, mime type `audio/mpeg`, e policies de leitura pública + escrita autenticada.

## Etapa 3 — Reescrever Edge Function `tts-generate`

`supabase/functions/tts-generate/index.ts` — reescrita completa.

Nova interface:
- Recebe `{ post_id, html_content }`
- Extrai texto puro do HTML (server-side, sem DOM)
- Divide em chunks de 4000 chars
- Gera MP3 via OpenAI TTS (modelo `tts-1`, voz `nova`)
- Concatena chunks em um único MP3
- Upload para `article-audio/{post_id}.mp3` via service role
- Atualiza `space_updates.audio_url` com URL pública
- Retorna `{ audio_url }`
- Mantém short-circuit para keep-alive (sem `post_id` e sem `html_content` → retorna `{ ok: true }`)

## Etapa 4 — Integrar no fluxo de publicação

`src/pages/admin/SpaceContent.tsx`:

- Adicionar função `generateArticleAudio(postId, htmlContent)` que chama a Edge Function via fetch
- No `handleSave`, após insert/update com `publish = true`, disparar `generateArticleAudio` em background (sem await — não bloqueia o admin)
- No `handlePublish` (publicar rascunho existente), também disparar a geração passando `update.id` e `update.content`

## Etapa 5 — Reimplementar `ArticleTTSPlayer`

`src/components/article/ArticleTTSPlayer.tsx` — reescrita completa.

Nova interface:
```typescript
interface ArticleTTSPlayerProps {
  postId: string;
  htmlContent: string;
  articleTitle: string;
  audioUrl?: string | null;
}
```

Lógica simplificada:
- Se tem `audioUrl` → toca direto via `<Audio>` element (igual PodcastPlayer)
- Se não tem → botão "Ouvir artigo" dispara geração lazy via Edge Function, depois toca
- Mini player inline com play/pause/stop e barra de progresso
- Remove dependência de `useArticleTTS`, `htmlToSpeechBlocks`, `useIsMobile`, `createPortal`
- Mantém CSS de sobreposição mobile via classes existentes

## Etapa 6 — Atualizar `PostContent.tsx` e `usePostDetail.ts`

**`src/hooks/usePostDetail.ts`**:
- Adicionar `audio_url` ao select da query (linha 66)
- Adicionar `audio_url` à interface `Post`

**`src/components/post/PostContent.tsx`**:
- Adicionar props `postId` e `audioUrl` à interface
- Passar `postId` e `audioUrl` ao `ArticleTTSPlayer`

**`src/pages/PostDetail.tsx`**:
- Passar `postId={post.id}` e `audioUrl={post.audio_url}` ao `PostContent`

## Etapa 7 — Edge Function de backfill

`supabase/functions/tts-backfill/index.ts` — nova.

Busca artigos publicados com `audio_url IS NULL`, chama `tts-generate` para cada um sequencialmente. Retorna contagem de sucesso/falha. Adicionada ao `config.toml` com `verify_jwt = false`.

## Etapa 8 — Remover arquivos obsoletos

- `src/hooks/useArticleTTS.ts` — deletar (lógica substituída pelo player inline)
- `src/utils/htmlToSpeechText.ts` — deletar (extração agora na Edge Function)

---

## Detalhes técnicos

### Arquivos alterados/criados
1. SQL migration — `audio_url` + índice
2. SQL migration — bucket + policies
3. `supabase/functions/tts-generate/index.ts` — reescrita
4. `supabase/functions/tts-backfill/index.ts` — novo
5. `supabase/config.toml` — adicionar bloco `tts-backfill`
6. `src/pages/admin/SpaceContent.tsx` — função + chamadas em handleSave/handlePublish
7. `src/components/article/ArticleTTSPlayer.tsx` — reescrita
8. `src/components/post/PostContent.tsx` — props adicionais
9. `src/hooks/usePostDetail.ts` — `audio_url` no select + interface
10. `src/pages/PostDetail.tsx` — passar props

### Arquivos removidos
1. `src/hooks/useArticleTTS.ts`
2. `src/utils/htmlToSpeechText.ts`

