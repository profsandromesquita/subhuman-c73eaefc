

# Plano: Edge Function og-meta + correção index.html

## 1. Criar `supabase/functions/og-meta/index.ts`

Edge Function que recebe `?space=X&post=Y`, busca o artigo no banco via anon key (dados públicos), e retorna HTML mínimo com meta tags OG dinâmicas + redirect via `<meta http-equiv="refresh">` para a URL real da SPA.

Código conforme fornecido pelo usuário, com CORS headers padrão e fallback para meta tags genéricas em caso de erro ou artigo não encontrado.

## 2. Registrar em `supabase/config.toml`

Adicionar bloco `[functions.og-meta]` com `verify_jwt = false` (endpoint público para bots).

## 3. Atualizar `index.html` (linhas 14-21)

Substituir as meta tags OG estáticas (incluindo a imagem do Lovable placeholder) por tags apontando para o domínio real:

```html
<meta property="og:title" content="Subhumano — Inteligência que Acompanha seu Ritmo" />
<meta property="og:description" content="Curadoria de inteligência artificial validada por especialistas. Aprenda IA de forma prática e aplicada." />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://subhumano.ia.br/og-default.png" />
<meta property="og:url" content="https://subhumano.ia.br" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@subhumano" />
<meta name="twitter:image" content="https://subhumano.ia.br/og-default.png" />
```

## Arquivos

1. `supabase/functions/og-meta/index.ts` — novo
2. `supabase/config.toml` — adicionar bloco og-meta
3. `index.html` — atualizar meta tags OG (linhas 14-21)

## Nota importante

A Edge Function resolve o problema para links compartilhados no formato:
`https://akkbfzfjappludgsrwsw.supabase.co/functions/v1/og-meta?space=produtividade&post=slug`

Para que links diretos como `https://subhumano.ia.br/spaces/.../post/...` funcionem com bots, será necessário um proxy (Cloudflare Worker) na frente — isso será uma etapa futura separada.

