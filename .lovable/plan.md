

# Sistema de Mensagens Diretas para o Subhumano

## Visao Geral

Atualmente, as mensagens enviadas pelo AuthorModal sao inseridas na tabela `notifications` como tipo `direct_message`, sem possibilidade de resposta ou historico de conversa. O plano cria um sistema de mensagens dedicado com uma nova tabela, nova pagina e ajustes no fluxo existente.

---

## O que muda para o usuario

1. O botao "Enviar mensagem" no modal de perfil continua funcionando, mas agora grava na nova tabela `messages` em vez de `notifications`
2. Uma nova pagina **/messages** exibe todas as conversas do usuario (enviadas e recebidas), agrupadas por contato
3. Ao clicar em uma conversa, o usuario ve o historico completo e pode responder diretamente
4. Um novo item "Mensagens" aparece no menu do Perfil, com badge de nao lidas
5. Ao receber uma mensagem, uma notificacao in-app continua sendo criada (para alerta), mas com link para `/messages`

---

## Detalhes Tecnicos

### 1. Nova tabela `messages`

```text
messages
  id          uuid (PK, default gen_random_uuid())
  sender_id   uuid (NOT NULL, references profiles.id)
  receiver_id uuid (NOT NULL, references profiles.id)
  content     text (NOT NULL)
  is_read     boolean (default false)
  created_at  timestamptz (default now())
```

Politicas RLS:
- SELECT: usuario ve mensagens onde `sender_id = auth.uid()` OU `receiver_id = auth.uid()`
- INSERT: usuario pode inserir onde `sender_id = auth.uid()` E `receiver_id IS NOT NULL`
- UPDATE: usuario pode marcar como lida onde `receiver_id = auth.uid()` (somente campo `is_read`)
- DELETE: nenhuma (mensagens nao podem ser apagadas)

Realtime habilitado para atualizacoes em tempo real.

### 2. Trigger para notificacao automatica

Um trigger `AFTER INSERT` na tabela `messages` cria automaticamente uma notificacao na tabela `notifications` para o destinatario, com `notification_url = '/messages'`, mantendo o sistema de alertas existente.

### 3. Novos arquivos

| Arquivo | Descricao |
|---|---|
| `src/pages/Messages.tsx` | Pagina principal de mensagens com lista de conversas |
| `src/pages/ConversationDetail.tsx` | Tela de conversa individual com historico e campo de resposta |
| `src/hooks/useMessages.ts` | Hook com queries para listar conversas, mensagens e enviar |

### 4. Arquivos alterados

| Arquivo | Alteracao |
|---|---|
| `src/components/post/AuthorModal.tsx` | `handleSendMessage` grava em `messages` em vez de `notifications` |
| `src/pages/Profile.tsx` | Adicionar item "Mensagens" no menu com icone `EnvelopeSimple` |
| `src/App.tsx` | Adicionar rotas `/messages` e `/messages/:recipientId` |

### 5. Pagina de Mensagens (`/messages`)

- Header com titulo "Mensagens" e logo
- Lista de conversas agrupadas por contato (ultimo remetente/destinatario)
- Cada card mostra: avatar, nome, ultima mensagem (truncada), horario, badge de nao lida
- Estado vazio com icone e texto "Nenhuma mensagem ainda"
- Ao clicar, navega para `/messages/:recipientId`

### 6. Tela de Conversa (`/messages/:recipientId`)

- Header com botao voltar, avatar e nome do contato
- Lista de mensagens em formato de chat (bolhas alinhadas esquerda/direita)
- Campo de texto na parte inferior com botao enviar
- Scroll automatico para a ultima mensagem
- Marcacao automatica como lida ao abrir a conversa
- Realtime para novas mensagens

### 7. Hook `useMessages`

- `useConversations()`: lista conversas agrupadas com ultimo texto e contagem de nao lidas
- `useConversationMessages(recipientId)`: mensagens de uma conversa especifica
- `useSendMessage()`: mutation para enviar mensagem
- `useMarkConversationRead(recipientId)`: marcar todas como lidas
- `useUnreadMessagesCount()`: contagem total de nao lidas (para badge)

### 8. Fluxo atualizado do AuthorModal

```text
Antes:
  Modal -> Insert em notifications -> Toast "Mensagem enviada!"

Depois:
  Modal -> Insert em messages -> Trigger cria notification -> Toast "Mensagem enviada!"
  (o toast tambem oferece link "Ver conversa" que navega para /messages/:recipientId)
```

---

## Ordem de implementacao

1. Criar tabela `messages` com RLS e trigger de notificacao (migration)
2. Criar hook `useMessages.ts`
3. Criar pagina `Messages.tsx` (lista de conversas)
4. Criar pagina `ConversationDetail.tsx` (chat)
5. Registrar rotas no `App.tsx`
6. Adicionar item "Mensagens" no `Profile.tsx`
7. Atualizar `AuthorModal.tsx` para gravar em `messages`

