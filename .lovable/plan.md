
# Tela "Salvos" — Acesso rapido a conteudos salvos

## Situacao atual

Quando o usuario salva um artigo ou podcast, os dados sao gravados nas tabelas `saved_updates` e `saved_podcasts`. Porem, **nao existe nenhuma tela para visualizar esses itens**. Os toasts mencionam "no perfil", mas a pagina de Perfil nao tem essa secao.

## Proposta

Criar uma nova pagina `/saved` (Salvos) acessivel a partir do Perfil, com abas para Artigos e Podcasts.

## Estrutura

```text
Perfil
  +-- [Bookmark] Conteudos salvos    <-- novo item no menu
        |
        +-- Aba: Artigos (saved_updates com join em space_updates)
        +-- Aba: Podcasts (saved_podcasts com join em podcasts)
```

## Mudancas

### 1. Nova pagina `src/pages/profile/SavedContent.tsx`
- Header com botao voltar e titulo "Conteudos salvos"
- Tabs com duas abas: **Artigos** e **Podcasts**
- Cada aba lista os itens salvos com: thumbnail, titulo, data de quando foi salvo
- Ao tocar em um item, navega para a pagina de detalhe (`/spaces/:slug/post/:postSlug` ou `/podcasts/:slug`)
- Botao de remover dos salvos (swipe ou icone)
- Estado vazio com icone BookmarkSimple e mensagem "Nenhum conteudo salvo ainda"

### 2. Novo hook `src/hooks/useSavedContent.ts`
- `useSavedArticles()`: query em `saved_updates` com join em `space_updates` (titulo, thumbnail, slug) e `spaces` (slug do espaco)
- `useSavedPodcasts()`: query em `saved_podcasts` com join em `podcasts` (titulo, cover, slug)
- `useRemoveSavedArticle()`: mutation para deletar de `saved_updates`
- `useRemoveSavedPodcast()`: mutation para deletar de `saved_podcasts`

### 3. Atualizar `src/pages/Profile.tsx`
- Adicionar novo item no menu entre "Assinatura" e "Dados pessoais":
  ```
  { icon: BookmarkSimple, label: "Conteudos salvos", description: "Artigos e podcasts", path: "/profile/saved" }
  ```

### 4. Registrar rota em `src/App.tsx`
- Adicionar rota `/profile/saved` apontando para `SavedContent`

### 5. Corrigir texto do toast
- Em `PostDetail.tsx`: manter "Voce pode acessar seus posts salvos no perfil" (agora sera verdade)
- Em `PodcastDetail.tsx`: manter "Voce pode acessar seus podcasts salvos no perfil" (agora sera verdade)

## Detalhes tecnicos

### Query de artigos salvos
```sql
SELECT su.id, su.created_at as saved_at,
       sp.title, sp.thumbnail_url, sp.slug as post_slug,
       s.slug as space_slug
FROM saved_updates su
JOIN space_updates sp ON su.update_id = sp.id
JOIN spaces s ON sp.space_id = s.id
WHERE su.user_id = $userId
ORDER BY su.created_at DESC
```

### Query de podcasts salvos
```sql
SELECT sp.id, sp.created_at as saved_at,
       p.title, p.cover_url, p.slug, p.duration_seconds
FROM saved_podcasts sp
JOIN podcasts p ON sp.podcast_id = p.id
WHERE sp.user_id = $userId
ORDER BY sp.created_at DESC
```

### Design
- Fundo `bg-background` (#000)
- Cards com `bg-card` (#141414), `rounded-xl`
- Thumbnail pequena a esquerda (48x48, rounded-lg)
- Titulo em `text-sm font-medium`, data em `text-xs text-muted-foreground`
- Icone BookmarkSimple preenchido como indicador de "salvo" / acao de remover
- Tabs usando componente `Tabs` do Radix
- Sem bordas visiveis, sem sombras

### Arquivos criados
- `src/pages/profile/SavedContent.tsx`
- `src/hooks/useSavedContent.ts`

### Arquivos editados
- `src/pages/Profile.tsx` (adicionar item no menu)
- `src/App.tsx` (adicionar rota)
