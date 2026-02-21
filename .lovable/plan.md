
# Correção: Falha intermitente ao acessar post de canal

## Problema

A query em `useChannelPostDetail.ts` usa um join PostgREST (`channels(name)`) sem foreign key formal definida entre `channel_posts` e `channels`. Isso causa falhas intermitentes quando o schema cache do PostgREST esta em refresh, resultando em "Post nao encontrado".

## Solucao

Remover o join implicito e buscar o nome do canal separadamente, seguindo o padrao ja documentado no projeto para tabelas sem FK formal.

## Alteracao

### Arquivo: `src/hooks/useChannelPostDetail.ts`

1. **Remover o join** na query principal (linha 50):
   - De: `.select("*, channels(name)")`
   - Para: `.select("*")`

2. **Buscar o canal separadamente** dentro do `Promise.all` ja existente (linhas 57-89), adicionando uma query:
   ```typescript
   supabase
     .from("channels")
     .select("name")
     .eq("id", postData.channel_id)
     .maybeSingle()
   ```

3. **Usar o resultado** na montagem do objeto `post` (linha 160):
   - De: `channel_name: (postData as any).channels?.name || "Canal"`
   - Para: `channel_name: channelResult.data?.name || "Canal"`

4. **Melhorar tratamento de erro** (linha 54): adicionar log do erro para facilitar debug futuro:
   ```typescript
   if (postError || !postData) {
     console.error("Erro ao buscar post do canal:", postError);
     return null;
   }
   ```

## Impacto

- Elimina a dependencia do schema cache do PostgREST para inferir o relacionamento
- Nenhuma mudanca visual -- o comportamento permanece identico quando funciona
- A query adicional e leve (busca por PK) e ja roda em paralelo com as outras 5 queries existentes
