

# Correção do link do artigo no email de resumo diário

## Problema identificado

Na edge function `send-daily-digest`, o link do artigo no email usa o **UUID** do post (`update.id`) em vez do **slug**:

```
Linha 296: href=".../${spaceInfo?.slug || 'home'}/post/${update.id}"
```

Porém a rota do app espera o slug do post: `/spaces/:spaceSlug/post/:postSlug`

Além disso, a query na linha 73 nem busca o campo `slug` da tabela `space_updates`.

## Solução

Duas alterações no arquivo `supabase/functions/send-daily-digest/index.ts`:

### 1. Adicionar `slug` na query (linha 73-75)

Incluir o campo `slug` no select:

```
id, title, slug, space_id, published_at, spaces(name, slug)
```

### 2. Corrigir o link no template HTML (linha 296)

Trocar `update.id` por `update.slug`:

```
href="https://subhumano.ia.br/spaces/${spaceInfo?.slug || 'home'}/post/${update.slug}"
```

### 3. Atualizar a interface SpaceUpdate (linha 21-27)

Adicionar `slug: string` na interface.

---

Essas 3 alterações pontuais corrigem o redirecionamento sem nenhum impacto colateral.
