

# Plano: OpenAI TTS via Edge Function

## Resumo

Substituir Web Speech API por OpenAI TTS. 3 arquivos alterados + 1 Edge Function nova. Zero alterações em banco, PostContent, ou outros componentes.

## 1. Secret `OPENAI_API_KEY`

Usar a ferramenta `add_secret` para solicitar ao usuário a chave da OpenAI antes de prosseguir.

## 2. Edge Function `supabase/functions/tts-generate/index.ts`

- Recebe `{ text: string }` via POST
- Valida JWT via `Authorization` header + `supabase.auth.getUser()`
- Chama `https://api.openai.com/v1/audio/speech` com model `tts-1-hd`, voice `nova`, format `mp3`
- Trunca texto em 4000 chars (limite OpenAI: 4096)
- Retorna stream de áudio `audio/mpeg` direto ao cliente
- CORS headers padrão
- Rejeita requests sem auth (401)

Adicionar ao `supabase/config.toml`:
```toml
[functions.tts-generate]
  verify_jwt = false
```

## 3. `src/hooks/useArticleTTS.ts` — reescrita completa

- Remove toda dependência de `window.speechSynthesis`
- `isSupported = true` (funciona em qualquer browser)
- Recebe `blocks: string[]`, junta em texto único, divide em chunks de 4000 chars (quebra no último `. `)
- Para cada chunk: chama Edge Function via `fetch` com JWT do Supabase, recebe blob MP3, cria `HTMLAudioElement`
- `audio.onended` → gera próximo chunk (recursivo)
- `play`: se pausado, resume audio; senão inicia pipeline
- `pause`: `audio.pause()`
- `stop`: cancela, revoga Object URLs, limpa refs
- Cleanup no `useEffect` return

## 4. `src/components/article/ArticleTTSPlayer.tsx` — 1 linha

Linha 88: trocar `'Carregando...'` por `'Gerando áudio...'`

## 5. `src/utils/htmlToSpeechText.ts` — sem alteração

O guard de `<p>` dentro de `<li>` já existe (linhas 26-31).

## Arquivos alterados

1. `supabase/functions/tts-generate/index.ts` — novo
2. `supabase/config.toml` — adicionar bloco tts-generate
3. `src/hooks/useArticleTTS.ts` — reescrita completa
4. `src/components/article/ArticleTTSPlayer.tsx` — 1 linha (texto loading)

