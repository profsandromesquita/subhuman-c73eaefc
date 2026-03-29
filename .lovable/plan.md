

# Plano: Corrigir Open Graph — JS redirect + image dimensions

## Arquivo 1: `supabase/functions/og-meta/index.ts`

### Edição 1 — Substituir meta refresh por JS redirect (linha 58)

**Antes:**
```html
<meta http-equiv="refresh" content="0;url=${esc(meta.url)}" />
```

**Depois:**
```html
<script>window.location.href="${meta.url.replace(/"/g, '\\"')}";</script>
```

Nota: Usar escape de aspas duplas direto na URL em vez de `esc()` (que converte `"` em `&quot;`, inválido dentro de JS string). A URL vem de constantes controladas (`SITE_URL` + slugs), sem risco de injeção.

### Edição 2 — Adicionar og:image dimensions (após linha 48)

Adicionar 3 meta tags após `og:image`:

```html
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/png" />
```

### DEFAULT_IMAGE — já correta

A constante `DEFAULT_IMAGE` (linha 12) já aponta para a URL pública do logo no Storage. Sem alteração necessária.

---

## Arquivo 2: `public/og-default.png` — NÃO criar

Não é possível gerar um PNG binário 1200×630 via código no ambiente Lovable. A `DEFAULT_IMAGE` já aponta para o logo público no Storage, que funciona corretamente. Criar um SVG placeholder não resolve o problema (Facebook não renderiza SVG como og:image).

**Recomendação futura:** Upload manual de um PNG 1200×630 no bucket `email-assets` e atualização da constante.

---

## Resumo de edições

1 arquivo alterado: `supabase/functions/og-meta/index.ts` — 2 edições (JS redirect + image dimensions)

## Não alterado

- index.html
- Componentes frontend
- Banco / RLS
- Outras Edge Functions

