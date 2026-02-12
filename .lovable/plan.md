

# Correcao Definitiva: Mencoes + Recuperacao de Senha

## Problema 1: Mencao na publicacao nao abre modal

### Causa raiz REAL (descoberta agora)

O `useEffect` que registra o event listener de clique (linhas 102-107 de `ChannelPostDetail.tsx`) roda ANTES do conteudo carregar. Quando o componente monta, `isLoading` e `true`, entao o `contentRef.current` e `null` (o skeleton e renderizado, nao a div do conteudo). Quando `isLoading` vira `false`, o componente re-renderiza com a div de conteudo, MAS o `useEffect` NAO re-executa porque sua dependencia (`handleMentionClick`) nao mudou. Resultado: o event listener NUNCA e registrado na div de conteudo.

**O mesmo bug existe em `PostContent.tsx`** -- o useEffect depende apenas de `handleMentionClick`, mas o `contentRef` pode nao estar disponivel no momento da montagem.

### Correcao

Adicionar `post` (ou `data`) como dependencia do `useEffect` para que ele re-execute apos o conteudo carregar:

```typescript
// ChannelPostDetail.tsx
useEffect(() => {
  const el = contentRef.current;
  if (!el) return;
  el.addEventListener('click', handleMentionClick);
  return () => el.removeEventListener('click', handleMentionClick);
}, [handleMentionClick, post]); // <-- adicionar post como dependencia
```

```typescript
// PostContent.tsx  
useEffect(() => {
  const el = contentRef.current;
  if (!el) return;
  el.addEventListener('click', handleMentionClick);
  return () => el.removeEventListener('click', handleMentionClick);
}, [handleMentionClick, content]); // <-- adicionar content como dependencia
```

---

## Problema 2: Mencoes nos comentarios do canal nao sao clicaveis

### Causa raiz

Em `ChannelPostDetail.tsx`, os comentarios sao renderizados na funcao `renderComment` (linha 254):

```typescript
<p className="text-sm mt-1">{comment.content}</p>
```

Isso renderiza o conteudo como TEXTO PURO. Mencoes como `@Sandro Costa Mesquita` aparecem como texto normal, sem nenhuma interatividade.

### Correcao

Importar e usar o componente `MentionText` do `CommentItem.tsx` (ou criar um inline) para renderizar o conteudo dos comentarios com mencoes clicaveis:

```typescript
// Substituir:
<p className="text-sm mt-1">{comment.content}</p>

// Por:
<MentionText text={comment.content} />
```

Mas o `MentionText` atual tem um bug de regex (veja problema 3).

---

## Problema 3: Regex do MentionText so captura uma palavra

### Causa raiz

O regex atual em `CommentItem.tsx` linha 91:

```typescript
const parts = text.split(/(@\S+)/g);
```

Para o texto `@Sandro Costa Mesquita`, isso captura apenas `@Sandro` -- o `\S+` para no primeiro espaco. "Costa Mesquita" vira texto normal.

### Correcao

Trocar a logica para detectar mencoes que comecam com `@` e continuam ate o proximo `@` ou fim da frase. Uma abordagem mais robusta: usar um regex que capture `@` seguido de palavras com letras maiusculas (nomes proprios):

```typescript
const parts = text.split(/(@[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+)*)/g);
```

Isso captura `@Sandro Costa Mesquita` como um bloco unico (nomes proprios com iniciais maiusculas).

---

## Problema 4: Recuperacao de senha -- URL de redirect

### Causa raiz

A URL `https://subhumano.ia.br/reset-password` precisa estar na lista de redirect URLs permitidas na configuracao de autenticacao do backend.

### Correcao

Usar a ferramenta `configure-auth` para adicionar as URLs de redirect permitidas:
- `https://subhumano.ia.br/reset-password`
- `https://subhuman.lovable.app/reset-password`

---

## Resumo de alteracoes

| Arquivo | Alteracao | Impacto |
|---------|-----------|---------|
| `src/pages/ChannelPostDetail.tsx` | 1. Adicionar `post` como dep do useEffect | Mencoes no post ficam clicaveis |
| `src/pages/ChannelPostDetail.tsx` | 2. Usar MentionText nos comentarios | Mencoes nos comentarios ficam clicaveis |
| `src/components/post/PostContent.tsx` | 3. Adicionar `content` como dep do useEffect | Mencoes em artigos ficam clicaveis |
| `src/components/post/CommentItem.tsx` | 4. Corrigir regex para nomes compostos | Nomes como "Sandro Costa Mesquita" completos |
| Configuracao Auth | 5. Adicionar redirect URLs | Email de recuperacao funciona |

### Ordem de execucao
1. Corrigir useEffect em ChannelPostDetail.tsx (adicionar dep + usar MentionText nos comentarios)
2. Corrigir useEffect em PostContent.tsx (adicionar dep)
3. Corrigir regex do MentionText em CommentItem.tsx
4. Exportar MentionText para reutilizacao
5. Configurar redirect URLs no auth

