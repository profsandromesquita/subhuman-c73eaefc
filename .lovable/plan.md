

# Correcao Definitiva: Mencoes Clicaveis + Recuperacao de Senha

## Problema 1: Mencao clicada rola para o topo da pagina

### Causa raiz identificada (definitiva)

O HTML da mencao gerado pelo Tiptap e:

```html
<a class="mention" data-mention-type="user" data-mention-id="dd98c4..." href="#">@Sandro Costa Mesquita</a>
```

O elemento e uma tag `<a>` com `href="#"`. Quando o usuario clica:
1. O navegador segue o `href="#"` -- rola para o topo da pagina
2. O handler JavaScript (`handleMentionClick`) nunca chama `e.preventDefault()` para impedir esse comportamento padrao do navegador

A correcao e simples e cirurgica: adicionar `e.preventDefault()` no inicio do handler de clique.

### Arquivos a corrigir

**1. `src/pages/ChannelPostDetail.tsx` (linha 59)**
- Adicionar `e.preventDefault()` na primeira linha de `handleMentionClick`

**2. `src/components/post/PostContent.tsx` (linha 62)**
- Adicionar `e.preventDefault()` na primeira linha de `handleMentionClick`

**3. `src/components/post/CommentItem.tsx`**
- Verificar se mencoes em comentarios tambem usam `<a href="#">` e aplicar a mesma correcao

---

## Problema 2: Email de recuperacao de senha nao chega

### Causa raiz identificada

A funcao `resetPassword` em `useAuth.ts` usa:
```typescript
const redirectUrl = `${window.location.origin}/reset-password`;
```

Isso gera a URL do ambiente atual (preview ou publicado). O problema e que o Supabase so aceita redirect URLs que estejam na lista de URLs permitidas nas configuracoes de autenticacao. A URL de preview (`https://id-preview--38842661...lovable.app`) e a URL publicada (`https://subhuman.lovable.app`) e o dominio customizado (`https://subhumano.ia.br`) precisam estar todos configurados.

Alem disso, o Supabase pode estar usando o email provider padrao (limitado) em vez de um SMTP configurado.

### Correcao

**1. Configurar as redirect URLs permitidas no Supabase Auth** usando a ferramenta configure-auth para adicionar:
- `https://subhuman.lovable.app/reset-password`
- `https://subhumano.ia.br/reset-password`
- A URL de preview

**2. Usar URL fixa do dominio de producao** em vez de `window.location.origin`:
- No `useAuth.ts`, alterar `resetPassword` para usar `https://subhumano.ia.br/reset-password` como URL fixa de redirect, garantindo que funcione independentemente de onde o usuario esta acessando

---

## Resumo tecnico de alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/ChannelPostDetail.tsx` | Adicionar `e.preventDefault()` no handler de mencao |
| `src/components/post/PostContent.tsx` | Adicionar `e.preventDefault()` no handler de mencao |
| `src/components/post/CommentItem.tsx` | Verificar e corrigir handler de mencao |
| `src/hooks/useAuth.ts` | Usar URL de producao fixa para redirect de recuperacao de senha |
| Configuracao Auth | Adicionar redirect URLs permitidas |

### Ordem de execucao
1. Corrigir `e.preventDefault()` nos 3 componentes de mencao
2. Corrigir URL de redirect no `useAuth.ts`
3. Configurar redirect URLs permitidas no auth

