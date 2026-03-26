

# Plano: Contagem de salvos no artigo

## Etapa 1 — Migration RLS

Nova policy SELECT pública em `saved_updates` para permitir COUNT global (a policy existente restringe a `auth.uid() = user_id`).

```sql
CREATE POLICY "Anyone can count saves"
ON public.saved_updates FOR SELECT TO public USING (true);
```

## Etapa 2 — `src/hooks/usePostDetail.ts`

- Adicionar 7ª query paralela no `Promise.all` (linha 79-119): `saved_updates.select("id", { count: "exact", head: true }).eq("update_id", postData.id)`
- Desestruturar como `savesCountResult`
- No return (linha 186): adicionar `savesCount: savesCountResult.count || 0`
- Na interface `PostDetailData`: adicionar `savesCount: number`

## Etapa 3 — `src/pages/PostDetail.tsx`

### 3.1 — Estado optimistic
Adicionar `optimisticSavesCount` (useState, default null) junto aos outros optimistic states (linhas 47-49). Derivar `savesCount` como `optimisticSavesCount ?? postDetail?.savesCount ?? 0`.

### 3.2 — handleSaveToggle optimistic
Nas linhas 88-89, adicionar `setOptimisticSavesCount(wasSaved ? savesCount - 1 : savesCount + 1)`. No catch (linha 100), reverter: `setOptimisticSavesCount(wasSaved ? savesCount : savesCount)`.

### 3.3 — Sidebar desktop (linha 340-348)
Trocar `{isSaved ? "Salvo" : "Salvar"}` por `{savesCount} salvos` + label abaixo (`isSaved ? "Salvo" : "Salvar"`), mantendo o padrão visual de curtidas/comentários.

### 3.4 — Passar props ao PostEngagement (linha 288-294)
Adicionar `savesCount`, `isSaved`, `onSave={handleSaveToggle}`.

## Etapa 4 — `src/components/post/PostEngagement.tsx`

- Expandir interface com `savesCount`, `isSaved`, `onSave`
- Na seção Stats: adicionar `BookmarkSimple` + `{savesCount} salvos`
- Na seção Action Buttons: adicionar botão "Salvar" com ícone `BookmarkSimple`, toggle visual fill/regular
- Importar `BookmarkSimple` de `@phosphor-icons/react`

## Arquivos alterados

1. Migration SQL (nova policy RLS)
2. `src/hooks/usePostDetail.ts` — query + campo savesCount
3. `src/pages/PostDetail.tsx` — optimistic state + sidebar + props
4. `src/components/post/PostEngagement.tsx` — props + UI salvos

