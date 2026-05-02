## Objetivo

Restaurar a conversão para JPEG via Supabase Render API na Edge Function `og-meta`, servindo a mesma URL transformada para TODOS os bots. A imagem original WebP no bucket permanece intacta — apenas a URL emitida nas meta tags muda.

## Arquivo único tocado

`supabase/functions/og-meta/index.ts`

Nenhum outro arquivo do repositório será modificado. Sem migrations, sem mudanças em `src/`, sem alterações em `BOT_PATTERNS` / `isBot` / Cloudflare / DNS / robots.txt.

## Confirmação prévia (já validada)

Inspecionei `supabase/functions/og-meta/index.ts` e confirmo:

- `BOT_PATTERNS` existe (linha 15)
- `isBot(ua)` existe (linha 22)
- `getImageUrl(thumbnailUrl)` existe (linha 27) — atualmente retorna a URL crua
- `buildHtml(...)` existe (linha 47)
- `getImageUrl` é chamada em 4 pontos: linhas 119, 150, 164, 177
- `og:image:type` está como `image/webp` na linha 69

Estrutura compatível com o plano. Prosseguir.

## Operações sequenciais

### 1. Adicionar helper `getRenderImageUrl`

Logo após `getImageUrl` (após linha ~33):

```typescript
function getRenderImageUrl(thumbnailUrl: string | null): string {
  const sourceUrl = (!thumbnailUrl || thumbnailUrl.trim() === '')
    ? DEFAULT_IMAGE
    : thumbnailUrl;

  if (sourceUrl.includes('/storage/v1/object/public/')) {
    const renderUrl = sourceUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    const separator = renderUrl.includes('?') ? '&' : '?';
    return `${renderUrl}${separator}width=1200&height=630&resize=cover&quality=85`;
  }

  return sourceUrl;
}
```

Sem `format=jpg` na querystring (parâmetro inválido — Render API converte para JPEG automaticamente quando há transformações).

### 2. Substituir as 4 chamadas

Trocar `getImageUrl(` por `getRenderImageUrl(` nas linhas 119, 150, 164 e 177. Mesmos argumentos.

### 3. Corrigir `og:image:type` em `buildHtml`

Linha 69:

```html
<meta property="og:image:type" content="image/webp" />
```

Vira:

```html
<meta property="og:image:type" content="image/jpeg" />
```

### 4. Adicionar `og:image:secure_url` em `buildHtml`

Imediatamente após a linha do `og:image` (linha ~63), adicionar:

```html
<meta property="og:image:secure_url" content="${esc(meta.image)}" />
```

Usa `esc(meta.image)` por consistência com o template existente (que já escapa todas as variáveis interpoladas).

### 5. Verificação visual no diff

- 4 chamadas a `getRenderImageUrl` (zero a `getImageUrl` restantes)
- `og:image:type` = `image/jpeg`
- `og:image:secure_url` presente
- `twitter:image` continua usando `meta.image` (mesma URL Render)
- `DEFAULT_IMAGE`, `BOT_PATTERNS`, `isBot` intactos

## Deploy e validação

Após aplicar o patch, fazer deploy de `og-meta` e executar os 5 testes via curl exatamente como especificado, retornando a saída literal de cada um.

Critérios de sucesso:

- Testes 1, 2: `og:image` contém `/render/image/public/` + `width=1200&height=630&resize=cover&quality=85`, sem `format=jpg`
- Teste 3: contém `image/jpeg`
- Teste 4: retorna linha com `og:image:secure_url`
- Teste 5: HTTP 200 + `content-type: image/jpeg`

Se qualquer teste falhar, reverter e alertar — sem tentativas incrementais.

## O que NÃO será feito

Nenhuma alteração em: `src/**`, `BOT_PATTERNS`, `isBot`, bifurcação por UA, Cloudflare, robots.txt, DNS, buckets, Storage, migrations, `DEFAULT_IMAGE`, criação de novos arquivos, inclusão de `format=jpg`.