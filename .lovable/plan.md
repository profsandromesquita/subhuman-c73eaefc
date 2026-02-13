

# Correcao global da visibilidade dos selos premium

## Problema

Os selos premium (azul e dourado) nao aparecem para nenhum usuario ao visualizar perfis de **outros** usuarios. Isso afeta:

- Resultados de busca (pagina Search)
- Autor do post (PostContent)
- Comentarios (CommentItem)
- Modal de perfil (AuthorModal)
- Posts de canais (ChannelPostDetail)

## Causa raiz

A tabela `subscriptions` possui uma politica RLS que so permite cada usuario ver **suas proprias** assinaturas:

```
"Users can view own subscriptions" -> qual: (auth.uid() = user_id)
```

O hook `useUserBadge` consulta a tabela `subscriptions` buscando o `plan_type` de **outros** usuarios, mas a RLS bloqueia a leitura. O resultado e sempre vazio, logo nenhum selo e exibido.

## Solucao

Adicionar uma politica RLS que permite qualquer usuario autenticado ler o status de assinatura de outros usuarios. Os dados expostos (user_id, plan_type, status) nao sao sensiveis - sao essencialmente informacoes publicas de status de membro.

### Migracao SQL

```sql
CREATE POLICY "Authenticated users can view active subscriptions for badges"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (status = 'active');
```

Esta politica permite que usuarios autenticados vejam apenas assinaturas ativas, que e exatamente o que o `useUserBadge` consulta.

## Impacto

- 1 migracao SQL (nova politica RLS)
- 0 arquivos de codigo alterados
- Corrige a exibicao de selos em **todos** os 5 pontos de uso simultaneamente
- Usuarios nao autenticados (visitantes) continuam sem acesso a tabela
- Apenas assinaturas com status "active" sao visiveis

## Auditoria dos pontos de uso

| Componente | Arquivo | Status apos correcao |
|---|---|---|
| Busca | Search.tsx | Corrigido |
| Autor do post | PostContent.tsx | Corrigido |
| Comentarios | CommentItem.tsx | Corrigido |
| Modal de perfil | AuthorModal.tsx | Corrigido |
| Post de canal | ChannelPostDetail.tsx | Corrigido |

Todos usam o mesmo hook `useUserBadge`, que faz a mesma query. A correcao na RLS resolve todos de uma vez.

