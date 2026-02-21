

# Tornar nomes de autores clicáveis nos Canais

## Problema

Nos canais (`/channels`), o nome do autor de posts e comentários não é clicável para abrir o modal de perfil (AuthorModal). Isso é inconsistente com o comportamento nos Espaços, onde clicar no nome abre o perfil do usuário.

**Comentários** já possuem o clique funcional (componente `ChannelCommentName`). Os dois pontos faltantes são:

1. **Nome do autor do post** na página de detalhe do post (`ChannelPostDetail.tsx`, linha 377) -- texto estático dentro de um `<p>`
2. **Nome do autor do post** na listagem do canal (`ChannelDetail.tsx`, linha 224-226) -- texto estático dentro de um `<span>`

---

## Solução

Transformar os textos estáticos em botões clicáveis que buscam o perfil no banco e abrem o `AuthorModal`, reutilizando o mesmo padrão já implementado no `ChannelCommentName`.

---

## Arquivos alterados

### 1. `src/pages/ChannelPostDetail.tsx`

**Linha 376-378** -- Substituir o `<p>` estático do nome do autor do post por um `<button>` clicável:

```
Antes:
<p className="font-medium flex items-center gap-1">
  {post.author_name}
  <PremiumBadge ... />
</p>

Depois:
<p className="font-medium flex items-center gap-1">
  <button
    onClick={async () => {
      if (!post.author_id) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, education, ...")
        .eq("id", post.author_id)
        .maybeSingle();
      if (data) { setMentionAuthor(data); setShowMentionModal(true); }
    }}
    className="hover:underline text-left"
  >
    {post.author_name}
  </button>
  <PremiumBadge ... />
</p>
```

### 2. `src/pages/ChannelDetail.tsx`

**Linhas 224-226** -- Substituir o `<span>` estático por um `<button>` clicável, e adicionar o `AuthorModal` (que ainda não existe nesse componente):

- Importar `AuthorModal` e `supabase`
- Adicionar estados `mentionAuthor` e `showMentionModal`
- Substituir o `<span>` por `<button>` com lógica de busca de perfil
- Adicionar o componente `<AuthorModal>` no final do JSX

---

## Resultado

Ao clicar no nome de qualquer autor (post ou comentário) em qualquer página de canal, o modal de perfil será exibido com as informações do usuário, assim como já funciona nos Espaços.
