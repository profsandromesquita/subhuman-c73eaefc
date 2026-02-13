

# Correcoes de UX/UI: Selos, Tags, Modais e Mencoes

## Resumo dos 5 problemas e solucoes

### 1. Tag "Pessoa" vs "Empresa" incorreta na busca

**Problema**: A busca mistura resultados de `profiles` e `companies` em duas tabelas separadas. Porem, um perfil com `account_type = 'empresa'` aparece como "Pessoa" porque vem da tabela `profiles`.

**Solucao**: No `useSearch.ts`, incluir `account_type` na query de profiles. No `SearchResultCard` em `Search.tsx`, verificar se `result.type === "user"` mas o `account_type` do perfil e "empresa" -- nesse caso exibir a tag "Empresa" em vez de "Pessoa". Adicionar campo `account_type` ao tipo `SearchResultUser`.

---

### 2. Selos inconsistentes na busca

**Problema**: O `useUserBadge` busca assinaturas pela coluna `user_id` em `subscriptions`. Para empresas (vindas da tabela `companies`), o hook recebe `undefined` (pois so e chamado quando `result.type === "user"`). Para perfis do tipo empresa, o selo funciona porque o `id` e um user_id valido. Porem, empresas vindas da tabela `companies` tem um `owner_id` que e o user_id do dono.

**Solucao**: Chamar `useUserBadge` para **todos** os resultados da busca:
- Para `type === "user"`: passar `result.id` (que e o user_id direto)
- Para `type === "company"`: adicionar `owner_id` ao `SearchResultCompany` (vindo da query) e passar esse `owner_id` ao `useUserBadge`

Isso garante que o selo reflita o plano do **dono** da empresa, independentemente de quem esta visualizando.

---

### 3. Clique na busca abre AuthorModal

**Problema**: `handleResultClick` para usuarios nao faz nada (comentario "no public user profile page"). Para empresas, navega para `/company/:slug`.

**Solucao**: Modificar `handleResultClick` e o `SearchResultCard` para:
- Ao clicar em qualquer resultado, buscar os dados completos (profiles ou companies) e abrir o `AuthorModal` -- o mesmo modal ja usado em posts e comentarios
- Adicionar estado `selectedAuthor` e `showAuthorModal` ao componente `Search`
- Remover a navegacao para `/company/:slug` (substituir pelo modal)

---

### 4. Selos globalizados (artigos, canais, comentarios)

**Problema reportado**: Selos nao aparecem em artigos, canais e comentarios.

**Analise do codigo**: Os selos **ja estao implementados** em:
- `PostContent.tsx` (linha 185): `PremiumBadge` ao lado do autor
- `CommentItem.tsx` (linha 177): `PremiumBadge` ao lado do comentarista
- `ChannelPostDetail.tsx` (linha 378): `PremiumBadge` no autor do post e comentarios (linha 268)
- `AuthorModal.tsx` (linha 55): `PremiumBadge` no modal

**Possivel causa**: Se o selo nao aparece para certos usuarios, pode ser que eles nao tenham uma assinatura com `status = 'active'` e `plan_type IN ('yearly', 'lifetime')`. Vou verificar os dados no banco.

**Acao**: Verificar dados de assinatura dos usuarios mencionados (Sandro, Roboticamente) e garantir que o hook `useUserBadge` esteja correto. Se necessario, corrigir a query.

---

### 5. Mencoes clicaveis (@) abrem modal

**Problema**: O `MentionText` (usado em comentarios) ja busca o perfil ao clicar em uma mencao e ja renderiza o `AuthorModal`. O codigo parece funcional.

**Analise**: O componente `MentionText` na linha 67-73 tem um `button` com `onClick` que chama `handleMentionClick`, que busca o perfil e abre o modal. Isso deveria funcionar.

**Possivel causa**: A regex na linha 60 pode nao detectar todos os nomes (ex: nomes com letras minusculas apos a primeira palavra). Alem disso, o `.single()` na query pode lancar erro silencioso quando nao encontra resultados, impedindo a segunda busca (companies).

**Solucao**: Corrigir o `MentionText` para usar `.maybeSingle()` em vez de `.single()` nas queries (evitar erro quando nao encontra). Isso garante que a busca de fallback em `companies` funcione.

---

## Detalhes tecnicos

### Arquivo: `src/hooks/useSearch.ts`
- Na query de profiles, adicionar `account_type` ao select
- Adicionar `account_type` ao mapeamento do resultado
- Na query de companies, adicionar `owner_id` ao select
- Adicionar `owner_id` ao mapeamento do resultado

### Arquivo: `src/hooks/useSearch.ts` (tipos)
- `SearchResultUser`: adicionar campo `account_type?: string | null`
- `SearchResultCompany`: adicionar campo `owner_id: string`

### Arquivo: `src/pages/Search.tsx`
- `SearchResultCard`: chamar `useUserBadge` para ambos os tipos (user com `result.id`, company com `result.owner_id`)
- Mostrar `PremiumBadge` para ambos os tipos
- Corrigir Badge de tipo: se `result.type === "user"` e `result.account_type === "empresa"`, mostrar "Empresa"
- Adicionar estado para `AuthorModal` (selectedAuthor, showModal)
- No `handleResultClick`: buscar dados completos do perfil/empresa e abrir AuthorModal
- Mover a logica de fetch para dentro do `SearchResultCard` ou para o `handleResultClick` no componente pai

### Arquivo: `src/components/post/MentionText.tsx`
- Trocar `.single()` por `.maybeSingle()` nas duas queries (profiles e companies)
- Isso evita erro silencioso e permite o fallback para companies funcionar

### Verificacao de dados
- Consultar `subscriptions` para os usuarios Sandro e Roboticamente para confirmar que os selos estao corretos no banco

---

## Ordem de implementacao

1. Corrigir `useSearch.ts` (adicionar account_type e owner_id)
2. Corrigir `Search.tsx` (tags, badges, AuthorModal no clique)
3. Corrigir `MentionText.tsx` (maybeSingle)
4. Verificar dados de assinatura no banco para validar selos

