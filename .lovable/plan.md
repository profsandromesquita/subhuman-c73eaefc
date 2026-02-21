

# Corrigir avatar ausente nos comentários de podcast

## Problema

No hook `usePodcastEngagement.ts`, a query de perfis dos comentaristas (linha 63) busca apenas `id` e `full_name`:

```
supabase.from("profiles").select("id, full_name")
```

O campo `avatar_url` nao e buscado, e a interface `PodcastComment` tambem nao inclui esse campo. Por isso, o `CommentItem` nunca recebe a URL do avatar e mostra apenas o fallback com as iniciais.

## Solucao

Tres alteracoes pontuais no arquivo `src/hooks/usePodcastEngagement.ts`:

### 1. Adicionar `avatarUrl` na interface `PodcastComment` (linha 10)

Incluir o campo opcional `avatarUrl?: string | null` na interface.

### 2. Incluir `avatar_url` na query de perfis (linha 63)

Mudar de:
```
supabase.from("profiles").select("id, full_name")
```
Para:
```
supabase.from("profiles").select("id, full_name, avatar_url")
```

### 3. Incluir `avatar_url` no Map de perfis e no mapeamento dos comentarios

- Alterar o `profilesMap` (linha 70) para armazenar um objeto `{ name, avatar }` em vez de apenas o nome
- No mapeamento dos comentarios (linha ~82), incluir `avatarUrl` usando o valor do Map

Nenhum outro arquivo precisa ser alterado, pois o `CommentSection` e o `CommentItem` ja aceitam e renderizam `avatarUrl` opcionalmente.

