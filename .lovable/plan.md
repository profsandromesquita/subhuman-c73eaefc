

# Correcao: Icone de Like nos Cards do SpaceDetail

## Causa Raiz

O hook `useSpaceUpdates` ja retorna `is_liked: true/false` para cada artigo (linha 87 de `usePosts.ts`), porem o componente `SpaceDetail.tsx` ignora esse campo. Na linha 159, o icone Heart esta fixo com `weight="regular"`, sem verificar `update.is_liked`.

## Correcao

Arquivo: `src/pages/SpaceDetail.tsx`

Alterar o bloco do botao de like (linhas 153-161) para:

1. Usar `weight={update.is_liked ? "fill" : "regular"}` no icone Heart
2. Aplicar `text-red-500` quando curtido, para feedback visual consistente com a pagina de detalhe do artigo (`PostEngagement.tsx`)

Antes:
```text
<Heart className="w-4 h-4" weight="regular" />
```

Depois:
```text
<Heart className={`w-4 h-4 ${update.is_liked ? "text-red-500" : ""}`} weight={update.is_liked ? "fill" : "regular"} />
```

## Impacto

- Zero risco de regressao: e uma mudanca puramente visual
- Nenhuma query ou mutacao precisa ser alterada
- O campo `is_liked` ja existe nos dados retornados pelo hook

