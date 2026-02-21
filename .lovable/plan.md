
# Tornar nome do contato clicável na tela de conversa

## Problema

Na página de detalhe da conversa (`/messages/:recipientId`), o nome do contato no header é um texto estático (`<p>`), sem possibilidade de clicar para ver o perfil.

## Solução

Adicionar o `AuthorModal` à página `ConversationDetail.tsx` e tornar o nome (e avatar) clicáveis, buscando os dados completos do perfil para alimentar o modal.

## Arquivo alterado

**`src/pages/ConversationDetail.tsx`**

1. Importar `AuthorModal` de `@/components/post/AuthorModal`
2. Expandir a query do contato para incluir os campos necessários pelo modal (`bio`, `education`, `instagram_url`, `linkedin_url`, `website`)
3. Adicionar estados `showAuthorModal` (boolean)
4. Tornar o avatar e o nome no header clicáveis (envolvê-los em um `button`)
5. Renderizar `<AuthorModal>` no final do JSX

### Alteracoes especificas

- **Linha 46** (query select): expandir de `"id, full_name, avatar_url"` para incluir `bio, education, instagram_url, linkedin_url, website`
- **Linha 31**: adicionar estado `const [showAuthorModal, setShowAuthorModal] = useState(false)`
- **Linhas 90-98** (avatar + nome no header): envolver em `<button onClick={() => setShowAuthorModal(true)}>`
- Após o input (final do JSX): adicionar `<AuthorModal author={contact} isOpen={showAuthorModal} onClose={() => setShowAuthorModal(false)} />`
